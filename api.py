# ==============================================================================
# DESTINATION : Fichier `api.py`
# RÔLE : Mon propre serveur météo dynamique (API REST)
# ==============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI(title="Météo API Dynamique")

# SÉCURITÉ : Autorise ton navigateur web à communiquer avec cette API locale
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
        f"&timezone=auto" 
    )
    reponse_meteo = requests.get(url_meteo).json()

    # 2. Requête Océan (Vagues, Courants)
    url_marine = (
        f"https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=wave_height,wave_direction,ocean_current_velocity,ocean_current_direction"
        f"&timezone=Europe%2FParis"
    )
    reponse_marine = requests.get(url_marine).json()

    # 3. Fusion Intelligente
    # Si le point GPS est dans l'océan, l'API marine renvoie "hourly". Sinon, elle renvoie une erreur.
    if "hourly" in reponse_marine:
        # On est en mer : on injecte la météo dans les données marines
        reponse_marine["hourly"].update(reponse_meteo.get("hourly", {}))
        donnees_finales = reponse_marine
    else:
        # On est sur terre (ex: Toulouse) : on ne garde que la météo
        donnees_finales = reponse_meteo

    return donnees_finales