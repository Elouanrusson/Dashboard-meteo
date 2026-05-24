# ==============================================================================
# DESTINATION : Fichier `prepare_data.py`
# RÔLE : Lire le JSON brut, le transformer en tableau (DataFrame) avec Pandas, 
#        et l'exporter en format CSV prêt pour le Machine Learning.
# ==============================================================================

import json
import pandas as pd

def preparer_dataset():
    nom_fichier_entree = "historique_toulouse.json"
    nom_fichier_sortie = "dataset_toulouse.csv"

    try:
        print("1. Lecture du fichier JSON brut...")
        with open(nom_fichier_entree, 'r', encoding='utf-8') as fichier:
            donnees_brutes = json.load(fichier)

        print("2. Conversion en tableau Pandas (DataFrame)...")
        # La magie de Pandas : il comprend nativement les listes parallèles d'Open-Meteo !
        df = pd.DataFrame(donnees_brutes['hourly'])

        # On renomme la colonne 'time' en 'date' pour plus de clarté
        df = df.rename(columns={'time': 'date'})

        print("3. Aperçu des 5 premières lignes du tableau :")
        print("-" * 50)
        print(df.head()) # Affiche les 5 premières lignes
        print("-" * 50)

        print(f"4. Sauvegarde dans le fichier propre : {nom_fichier_sortie}")
        # On exporte en CSV (sans garder l'index des lignes qui ne sert à rien)
        df.to_csv(nom_fichier_sortie, index=False)
        
        print("✅ Le jeu de données est prêt pour l'Intelligence Artificielle !")

    except FileNotFoundError:
        print(f"❌ Erreur : Le fichier {nom_fichier_entree} est introuvable. As-tu bien lancé fetch_history.py avant ?")
    except Exception as e:
        print(f"❌ Une erreur inattendue est survenue : {e}")

if __name__ == "__main__":
    preparer_dataset()