# ==============================================================================
# DESTINATION : Fichier `main_backend.py` (Version Windows)
# RÔLE : Lancer une seule fois les extractions et s'éteindre.
# ==============================================================================

from datetime import datetime
from fetch_toulouse import previsions_toulouse_ia
from fetch_manche import recuperer_grille_manche

def execution_globale():
    print(f"\n🔔 [{datetime.now().strftime('%H:%M:%S')}] Lancement de la mise à jour...")
    
    try:
        previsions_toulouse_ia()
    except Exception as e:
        print(f"❌ Échec Toulouse : {e}")
        
    try:
        recuperer_grille_manche()
    except Exception as e:
        print(f"❌ Échec Manche : {e}")

    print("✅ Mise à jour terminée avec succès.")

if __name__ == "__main__":
    execution_globale()