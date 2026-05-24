# ==============================================================================
# DESTINATION : Fichier `fetch_manche.py`
# RÔLE : Interroger l'API Marine pour une grille de 9 points dans la Manche.
# ==============================================================================

import requests
import json

def recuperer_grille_manche():
    # 1. Définition de notre grille (3 latitudes × 3 longitudes = 9 points)
    # On balaie la Manche de haut en bas, et de gauche à droite
    lats = [50.5, 50.5, 50.5, 50.0, 50.0, 50.0, 49.5, 49.5, 49.5]
    lons = [-1.5, -0.5,  0.5, -1.5, -0.5,  0.5, -1.5, -0.5,  0.5]
    
    # 2. Formatage pour l'API (Open-Meteo veut les listes séparées par des virgules)
    str_lats = ",".join(map(str, lats))
    str_lons = ",".join(map(str, lons))

    # 3. L'URL cible désormais l'API Marine (modèle Copernicus)
    # Variables : Hauteur houle, Direction houle, Vitesse courant, Direction courant
    url = (
        f"https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={str_lats}&longitude={str_lons}"
        f"&hourly=wave_height,wave_direction,ocean_current_velocity,ocean_current_direction"
        f"&timezone=Europe%2FParis"
    )

    try:
        print("🌊 Déploiement de la grille de 9 bouées virtuelles dans la Manche...")
        reponse = requests.get(url)
        reponse.raise_for_status()
        
        # Récupération des données
        donnees = reponse.json()
        
        # Sauvegarde
        nom_fichier = "donnees_manche.json"
        with open(nom_fichier, 'w', encoding='utf-8') as fichier:
            json.dump(donnees, fichier, ensure_ascii=False, indent=4)
            
        print(f"✅ Succès ! Les données océaniques sont sauvegardées dans : {nom_fichier}")
        
        # Petite vérification de ce que l'API nous a renvoyé
        if isinstance(donnees, list):
            print(f"📍 L'API a retourné une liste contenant {len(donnees)} points géographiques distincts.")

    except Exception as e:
        print(f"❌ Erreur de connexion ou d'écriture : {e}")

if __name__ == "__main__":
    recuperer_grille_manche()