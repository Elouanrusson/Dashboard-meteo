# ==============================================================================
# DESTINATION : Fichier `fetch_toulouse.py` (Mise à jour)
# RÔLE : Récupérer les prévisions, faire intervenir l'IA pour corriger 
#        les rafales, et sauvegarder pour le site web.
# ==============================================================================

import requests
import json
import joblib
import pandas as pd

def previsions_toulouse_ia():
    lat = 43.6047
    lon = 1.4442
    
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
        f"&models=meteofrance_arome_france"
        f"&timezone=Europe%2FParis"
        f"&forecast_days=2"
    )
    
    try:
        print("1. 📡 Téléchargement des prévisions AROME...")
        reponse = requests.get(url)
        reponse.raise_for_status()
        donnees = reponse.json()
        
        # --- L'INTERVENTION DE L'IA ---
        print("2. 🧠 Chargement du cerveau (IA)...")
        try:
            modele_ia = joblib.load("cerveau_rafales.pkl")
            
            # On prépare le vent prévu pour l'IA (format DataFrame Pandas comme à l'entraînement)
            vents_prevus = donnees['hourly']['wind_speed_10m']
            df_futur = pd.DataFrame({'wind_speed_10m': vents_prevus})
            
            # L'IA prédit les rafales futures !
            print("3. ⚡ Calcul des nouvelles rafales sur-mesure...")
            rafales_ia = modele_ia.predict(df_futur)
            
            # On remplace les rafales de Météo-France par celles de ton IA
            # (On arrondit à 1 chiffre après la virgule pour que ce soit joli à l'écran)
            donnees['hourly']['wind_gusts_10m'] = [round(rafale, 1) for rafale in rafales_ia]
            print("   -> Succès : Les données officielles ont été écrasées par l'IA.")
            
        except FileNotFoundError:
            print("⚠️ Attention : Le fichier 'cerveau_rafales.pkl' est introuvable.")
            print("   -> Les données officielles de Météo-France seront utilisées.")
        
        # --- SAUVEGARDE POUR LE SITE WEB ---
        nom_fichier = "donnees_toulouse.json"
        with open(nom_fichier, 'w', encoding='utf-8') as fichier:
            json.dump(donnees, fichier, ensure_ascii=False, indent=4)
            
        print(f"4. ✅ Données finales sauvegardées dans : {nom_fichier}")

    except Exception as e:
        print(f"❌ Erreur générale : {e}")

if __name__ == "__main__":
    previsions_toulouse_ia()