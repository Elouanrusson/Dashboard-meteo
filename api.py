# ==============================================================================
# DESTINATION : Fichier `api.py`
# RÔLE : Mon propre serveur météo dynamique (API REST) + Intelligence Artificielle
# ==============================================================================

import joblib
import os 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
from fastapi import Response
from fastapi.responses import RedirectResponse
import pandas as pd

app = FastAPI()

# --- CHARGEMENT DU CERVEAU IA ---
modele_ia = None
if os.path.exists("cerveau_rafales.pkl"):
    modele_ia = joblib.load("cerveau_rafales.pkl")
    print("✅ Modèle IA chargé avec succès !")
else:
    print("⚠️ Attention : fichier cerveau_rafales.pkl introuvable.")

# SÉCURITÉ : Autorise ton navigateur web à communiquer avec cette API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def accueil():
    return {"message": "L'API Météo IA est en ligne !"}

@app.get("/previsions")
def obtenir_previsions(lat: float, lon: float):
    # 1. Requête Météo classique (Mondiale)
    url_meteo = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation,cape,surface_pressure"
        f"&past_days=1"
        f"&timezone=auto" 
    )
    reponse_meteo = requests.get(url_meteo).json()

    # 2. Requête Océan (Vagues, Courants)
    url_marine = (
        f"https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=wave_height,wave_direction,ocean_current_velocity,ocean_current_direction"
        f"&past_days=1"
        f"&timezone=Europe%2FParis"
    )
    reponse_marine = requests.get(url_marine).json()

    # 3. Fusion Intelligente
    if "hourly" in reponse_marine:
        # On est en mer : on injecte la météo dans les données marines
        reponse_marine["hourly"].update(reponse_meteo.get("hourly", {}))
        donnees_finales = reponse_marine
    else:
        # On est sur terre : on ne garde que la météo
        donnees_finales = reponse_meteo

    # 4. --- BRAIN GAIN : INTERVENTION DE L'INTELLIGENCE ARTIFICIELLE ---
    if "hourly" in donnees_finales:
        hourly_data = donnees_finales["hourly"]
        vitesses_vent = hourly_data.get("wind_speed_10m", [])
        rafales_ia = []

        # Si l'IA est bien chargée et qu'on a des données de vent
        if modele_ia and vitesses_vent:
            try:
                # CORRECTION UX : On crée un DataFrame avec le nom de colonne attendu par Scikit-Learn
                X_entree = pd.DataFrame(vitesses_vent, columns=["wind_speed_10m"])
                
                # Calcul de toutes les prédictions d'un seul coup (sans Warning !)
                predictions = modele_ia.predict(X_entree)
                rafales_ia = [round(float(p), 1) for p in predictions]
            except Exception as e:
                print(f"❌ Erreur lors du calcul IA : {e}")
                rafales_ia = [None] * len(vitesses_vent)
        else:
            rafales_ia = [None] * len(vitesses_vent)

        # On injecte notre nouvelle colonne IA dans le dictionnaire final
        hourly_data["rafales_ia"] = rafales_ia

    # CORRECTION CRUCIALE : Le retour des données est bien placé ICI, à la fin de la fonction !
    return donnees_finales

# ==============================================================================
# PROXY ULTRA-RAPIDE (REDIRECTION) : Finis les embouteillages et les erreurs 500 !
# ==============================================================================
@app.get("/cartes/{couche}/{z}/{x}/{y}")
def obtenir_carte_meteo(couche: str, z: int, x: int, y: int, palette: str = None):
    # 1. Récupération de la clé API secrète depuis Render
    cle_owm = os.getenv("OPENWEATHERMAP_API_KEY", "CLE_SECRETE_SUR_RENDER")
    
    # 2. Nettoyage de l'URL au cas où le navigateur rajouterait des paramètres
    nom_couche = couche.split('?')[0]
    
    # 3. Assemblage du lien final avec la clé
    url_owm = f"https://tile.openweathermap.org/map/{nom_couche}/{z}/{x}/{y}.png?appid={cle_owm}"
    
    # 4. Injection de la palette si présente
    if palette:
        url_owm += f"&palette={palette}"
    elif "temp" in nom_couche:
        url_owm += "&palette=-10:800080;0:0000ff;10:00ffff;20:00ff00;30:ffff00;35:ffa500;40:ff0000"
    elif "wind" in nom_couche:
        url_owm += "&palette=0:0000ff;5:00ffff;15:00ff00;25:ffff00;40:ffa500;60:ff0000"

    # 5. L'ASTUCE MAGIQUE : On dit au navigateur d'aller chercher l'image lui-même !
    # Le serveur Python se libère instantanément de la charge.
    return RedirectResponse(url=url_owm)