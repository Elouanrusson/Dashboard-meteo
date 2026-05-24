# ==============================================================================
# DESTINATION : Fichier `train_ia.py`
# RÔLE : Entraîner une Régression Linéaire pour prédire les Rafales (y) 
#        à partir du Vent Moyen (x) en utilisant l'historique de Toulouse.
# ==============================================================================

import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

def entrainer_modele():
    # 1. Chargement des données propres
    print("📥 Chargement du dataset...")
    df = pd.read_csv("dataset_toulouse.csv")
    
    # 2. Définition du problème
    # X (Features) : Ce qu'on donne à l'IA pour réfléchir (il faut des doubles crochets pour un DataFrame)
    X = df[['wind_speed_10m']] 
    # y (Target) : Ce qu'on veut que l'IA apprenne à deviner
    y = df['wind_gusts_10m']

    # 3. Séparation des données (La Règle d'Or en Machine Learning)
    # On garde 80% des données pour l'apprentissage, et on cache 20% pour l'examen final
    print("✂️ Séparation des données (80% Apprentissage / 20% Test)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Création et Entraînement du "Cerveau"
    print("🧠 Entraînement de l'IA (Régression Linéaire)...")
    modele = LinearRegression()
    modele.fit(X_train, y_train) # C'est ici que la magie mathématique opère !

    # 5. Extraction de la formule mathématique trouvée
    poids_a = modele.coef_[0]
    biais_b = modele.intercept_
    
    print("\n✅ Modèle entraîné avec succès !")
    print("-" * 50)
    print("Voici la règle que l'IA a découverte pour Toulouse :")
    print(f"Rafale prévue = ({poids_a:.2f} × Vent Moyen) + {biais_b:.2f} km/h")
    print("-" * 50)

    # 6. L'Examen Final (Le Test)
    # On lui demande de prédire les 20% qu'elle n'a jamais vus, et on compare avec la réalité
    predictions = modele.predict(X_test)
    erreur_moyenne = mean_absolute_error(y_test, predictions)
    
    print(f"\n🎯 Évaluation : En moyenne, l'IA se trompe de {erreur_moyenne:.2f} km/h sur ses prédictions de rafales.")

    # 7. Sauvegarde du modèle entraîné
    nom_fichier_modele = "cerveau_rafales.pkl"
    joblib.dump(modele, nom_fichier_modele)
    print(f"\n💾 Le cerveau de l'IA a été sauvegardé dans : {nom_fichier_modele}")

if __name__ == "__main__":
    entrainer_modele()