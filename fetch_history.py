# ==============================================================================
# DESTINATION : Fichier `fetch_history.py`
# RÔLE : Contacter l'API d'Archives pour récupérer la "Vérité Terrain" 
#        (ce qu'il s'est réellement passé) sur 3 mois à Toulouse.
# ==============================================================================

import requests
import json

def recuperer_historique_toulouse():
    # Coordonnées de Toulouse
    lat = 43.6047
    lon = 1.4442
    
    # Période de l'historique (Format : AAAA-MM-JJ)
    date_debut = "2026-01-01"
    date_fin = "2026-03-31"
    
    # URL modifiée : on attaque le sous-domaine "archive-api"
    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={date_debut}&end_date={date_fin}"
        f"&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
        f"&timezone=Europe%2FParis"
    )
    
    try:
        print(f"⏳ Extraction des archives météo du {date_debut} au {date_fin}...")
        reponse = requests.get(url)
        reponse.raise_for_status() # On vérifie que la connexion est bonne
        
        donnees = reponse.json()
        nom_fichier = "historique_toulouse.json"
        
        # Sauvegarde du gros volume de données
        with open(nom_fichier, 'w', encoding='utf-8') as fichier:
            json.dump(donnees, fichier, ensure_ascii=False, indent=4)
            
        nb_heures = len(donnees['hourly']['time'])
        print(f"✅ Succès total !")
        print(f"📦 {nb_heures} heures de données historiques ont été sauvegardées dans le fichier : {nom_fichier}")

    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur réseau : {e}")
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde : {e}")

# Point d'entrée
if __name__ == "__main__":
    recuperer_historique_toulouse()