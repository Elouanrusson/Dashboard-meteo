@echo off
cd "C:\Users\eloua\Projet_Meteo"

echo ===================================================
echo 🌍 LE SERVEUR WINDGURU EST EN LIGNE !
echo ===================================================
echo.
echo Ouvre ton navigateur et va a l'adresse :
echo http://localhost:8000
echo.
echo (Laisse cette fenetre noire ouverte pendant que tu consultes la meteo)
echo.

:: La commande magique de Python pour créer un serveur web instantané
python -m http.server 8000