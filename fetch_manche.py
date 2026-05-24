# ==============================================================================
# DESTINATION : Fichier `fetch_manche.py`
# RÔLE : Interroger et fusionner les API Marine et Météo pour la Manche.
# ==============================================================================

import requests
import json

def recuperer_grille_manche():
    try: # Ajout du bloc try pour sécuriser le code
        # 1. Définition de notre grille (3 latitudes × 3 longitudes = 9 points)
        lats = [50.5, 50.5, 50.5, 50.0, 50.0, 50.0, 49.5, 49.5, 49.5]
        lons = [-1.5, -0.5,  0.5, -1.5, -0.5,  0.5, -1.5, -0.5,  0.5]
        
        # 2. Formatage pour l'API
        str_lats = ",".join(map(str, lats))
        str_lons = ",".join(map(str, lons))

        # 3. Requête vers le serveur Océanique (Houle et Courants)
        url_marine = (
            f"https://marine-api.open-meteo.com/v1/marine"
            f"?latitude={str_lats}&longitude={str_lons}"
            f"&hourly=wave_height,wave_direction,ocean_current_velocity,ocean_current_direction"
            f"&timezone=Europe%2FParis"
        )
        
        # 4. Requête vers le serveur Atmosphérique (Nuages, Orages, Vent)
        url_meteo = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={str_lats}&longitude={str_lons}"
            f"&hourly=cloud_cover,precipitation,cape,surface_pressure,wind_gusts_10m,wind_speed_10m"
            f"&timezone=Europe%2FParis"
        )

        # On télécharge les deux paquets de données
        reponse_marine = requests.get(url_marine).json()
        reponse_meteo = requests.get(url_meteo).json()

        # Fusion intelligente
        if isinstance(reponse_marine, list):
            for i in range(len(reponse_marine)):
                reponse_marine[i]['hourly'].update(reponse_meteo[i]['hourly'])
            donnees_finales = reponse_marine
        else:
            reponse_marine['hourly'].update(reponse_meteo['hourly'])
            donnees_finales = [reponse_marine] 
            
        # 5. Sauvegarde (l'indentation est corrigée ici, au même niveau que le if/else)
        nom_fichier = "donnees_manche.json"
        with open(nom_fichier, 'w', encoding='utf-8') as fichier:
            # On utilise bien donnees_finales ici
            json.dump(donnees_finales, fichier, ensure_ascii=False, indent=4)
            
        print(f"✅ Succès ! Les données fusionnées sont sauvegardées dans : {nom_fichier}")
        
        if isinstance(donnees_finales, list):
            print(f"📍 L'API a retourné une liste contenant {len(donnees_finales)} points géographiques distincts.")

    except Exception as e:
        print(f"❌ Erreur de connexion ou d'écriture : {e}")

if __name__ == "__main__":
    recuperer_grille_manche()