# ==============================================================================
# DESTINATION : Fichier `api.py`
# RÔLE : Mon propre serveur météo dynamique (API REST) + Intelligence Artificielle
# ==============================================================================

import joblib
import os  # <-- AJOUT INDISPENSABLE : pour éviter le crash sur os.path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# --- CHARGEMENT DU CERVEAU IA ---
modele_ia = None
if os.path.exists("cerveau_rafales.pkl"):
    modele_ia = joblib.load("cerveau_rafales.pkl")
    print("✅ Modèle IA chargé avec succès !")
else:
    print("⚠️ Attention : fichier cerveau_rafales.pkl introuvable.")

# SÉCURITÉ : Autorise ton navigateur web à communiquer avec cette API locale ou Cloud
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
    if "hourly" in reponse_marine:
        # On est en mer : on injecte la météo dans les données marines
        reponse_marine["hourly"].update(reponse_meteo.get("hourly", {}))
        donnees_finales = reponse_marine
    else:
        # On est sur terre (ex: Toulouse) : on ne garde que la météo
        donnees_finales = reponse_meteo

    # 4. --- BRAIN GAIN : INTERVENTION DE L'INTELLIGENCE ARTIFICIELLE ---
    if "hourly" in donnees_finales:
        hourly_data = donnees_finales["hourly"]
        vitesses_vent = hourly_data.get("wind_speed_10m", [])
        rafales_ia = []

        # Si l'IA est bien chargée et qu'on a des données de vent
        if modele_ia and vitesses_vent:
            # Scikit-Learn attend une structure en tableau 2D : [[v1], [v2], [v3]...]
            X_entree = [[v] for v in vitesses_vent]
            try:
                # Calcul de toutes les prédictions d'un seul coup
                predictions = modele_ia.predict(X_entree)
                # On arrondit proprement chaque résultat à 1 décimale
                rafales_ia = [round(float(p), 1) for p in predictions]
            except Exception as e:
                print(f"❌ Erreur lors du calcul IA : {e}")
                # En cas de bug de calcul, on met des valeurs nulles pour ne pas bloquer le site
                rafales_ia = [None] * len(vitesses_vent)
        else:
            # Si le fichier .pkl est manquant, on crée une liste vide sécurisée
            rafales_ia = [None] * len(vitesses_vent)

        # On injecte notre nouvelle colonne IA dans le dictionnaire final !
        hourly_data["rafales_ia"] = rafales_ia

    return donnees_finales