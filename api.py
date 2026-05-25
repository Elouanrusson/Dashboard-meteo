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
import pandas as pd  # <-- AJOUT : Pour régler l'avertissement des noms de colonnes de l'IA

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
# PROXY SÉCURISÉ & UNIVERSEL : Supporte les nuages, les vents et les températures avec palettes !
# ==============================================================================
@app.get("/cartes/{couche}/{z}/{x}/{y}")
def obtenir_carte_meteo(couche: str, z: int, x: int, y: int, palette: str = None):
    # 1. Récupération sécurisée de la clé d'API
    cle_owm = os.getenv("OPENWEATHERMAP_API_KEY", "CLE_SECRETE_SUR_RENDER") [cite: 28, 29]
    
    # 2. Construction de l'URL de base pour la couche demandée
    url_owm = f"https://tile.openweathermap.org/map/{couche}/{z}/{x}/{y}.png?appid={cle_owm}" [cite: 29]
    
    # 3. 💡 L'astuce : Si le fichier .js a envoyé une palette personnalisée, on l'ajoute proprement à l'URL !
    if palette:
        url_owm += f"&palette={palette}"
    
    try:
        # Téléchargement discret de l'image de la carte thermique
        reponse = requests.get(url_owm) [cite: 29]
        return Response(content=reponse.content, media_type="image/png") [cite: 29]
    except Exception as e:
        print(f"❌ Erreur Proxy Cartes : {e}") [cite: 30]
        return Response(content=b"", status_code=500) [cite: 30]