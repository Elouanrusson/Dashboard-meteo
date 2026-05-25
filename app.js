// ==============================================================================
// DESTINATION : app.js (Version Pro Finalisée)
// RÔLE : Carte marine figée au Slider / Tableau contextuel avec surlignage.
// ==============================================================================

// --- PARTIE 1 : ÉTAT GLOBAL ET INITIALISATION DE LA CARTE ---

// 1. Définition du fond de carte principal
const fondOpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

// 2. Création de la carte avec une vue par défaut
const carte = L.map('ma-carte', {
    center: [50.0, -0.5],
    zoom: 7,
    layers: [fondOpenStreetMap] // On charge le fond OSM par défaut
});

// Variable pour stocker le marqueur visuel du clic
let marqueurDynamique = null;

// Variables globales de ton application
const groupeFleches = L.layerGroup().addTo(carte);

// 3. Préparation du menu de contrôle des couches (en haut à droite)
const couchesDeBase = {
    "Carte Standard": fondOpenStreetMap
};
const couchesSuperposees = {}; 

const controleurDeCouches = L.control.layers(couchesDeBase, couchesSuperposees).addTo(carte);

// ==============================================================================
// RADAR DE PLUIE (RainViewer) - Mise à jour automatique des couches
// ==============================================================================
async function chargerRadarPluie() {
    try {
        const rep = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await rep.json();
        
        // Récupération de la dernière image radar disponible
        const derniereImage = data.radar.past[data.radar.past.length - 1]; 

        // Création de la couche transparente de pluie
        const radarPluie = L.tileLayer(`${data.host}${derniereImage.path}/256/{z}/{x}/{y}/2/1_1.png`, {
            opacity: 0.6, 
            attribution: "Radar © RainViewer"
        });

        // Ajout de la case à cocher dans le menu de droite
        controleurDeCouches.addOverlay(radarPluie, "🌧️ Radar de Précipitations");

    } catch (erreur) {
        console.error("❌ Impossible de charger le radar RainViewer :", erreur);
    }
}

// Lancement automatique du radar au démarrage
chargerRadarPluie();

// ==============================================================================
// 4. BOUTON "ME LOCALISER" (Géolocalisation GPS)
// ==============================================================================

// On crée un bouton personnalisé dans le coin supérieur gauche de la carte
const boutonGPS = L.control({ position: 'topleft' });

boutonGPS.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    // On crée un bouton HTML blanc avec une icône cible
    div.innerHTML = `
        <button id="btn-gps" style="
            background: white; 
            border: none; 
            width: 34px; 
            height: 34px; 
            cursor: pointer; 
            font-size: 1.3em; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            border-radius: 4px;
            box-shadow: 0 1px 5px rgba(0,0,0,0.4);
        " title="Me localiser">🎯</button>
    `;
    return div;
};

// On ajoute le bouton à la carte
boutonGPS.addTo(carte);

// Écouteur de clic sur notre nouveau bouton cible
document.getElementById('btn-gps').addEventListener('click', function() {
    // 🛡️ Vérification : est-ce que le navigateur gère le GPS ?
    if (!navigator.geolocation) {
        alert("Désolé, votre appareil ne supporte pas la géolocalisation.");
        return;
    }

    // Petit effet visuel de chargement pendant que le GPS cherche le signal
    const bouton = document.getElementById('btn-gps');
    bouton.innerText = "⏳";

    // On demande la position exacte au téléphone/PC
    navigator.geolocation.getCurrentPosition(
        async function (position) {
            bouton.innerText = "🎯"; // On remet la cible
            
            // Extraction et arrondissement des coordonnées GPS
            const lat = position.coords.latitude.toFixed(2);
            const lon = position.coords.longitude.toFixed(2);

            console.log(`📍 Position GPS détectée : Lat ${lat}, Lon ${lon}`);

            // 1. On centre la carte sur l'utilisateur et on zoom
            carte.setView([lat, lon], 10);

            // 2. On place le marqueur dynamique à cet endroit
            if (marqueurDynamique) {
                carte.removeLayer(marqueurDynamique);
            }
            marqueurDynamique = L.marker([lat, lon]).addTo(carte)
                .bindPopup(`<b>Vous êtes ici</b><br>Lat: ${lat}<br>Lon: ${lon}`).openPopup();

            // 3. On interroge ton serveur Cloud de production (avec le cache buster)
            try {
                const rep = await fetch(`https://dashboard-meteo.onrender.com/previsions?lat=${lat}&lon=${lon}&t=${Date.now()}`);
                const data = await rep.json();

                // 4. On dessine le tableau extensible
                dessinerTableau(data.hourly, "Ma Position (GPS)");

            } catch (erreur) {
                console.error("❌ Erreur lors de la récupération météo GPS :", erreur);
            }
        },
        function (erreur) {
            // En cas de refus du GPS par l'utilisateur ou de signal perdu
            bouton.innerText = "🎯";
            console.warn("Erreur GPS :", erreur.message);
            alert("Impossible de vous localiser. Assurez-vous d'avoir autorisé le partage de position dans les réglages de votre appareil.");
        }
    );
});

// ==============================================================================
// 3. AJOUT DES COUCHES OPENWEATHERMAP (Nuages & Vent)
// ==============================================================================
const cleAPI_OWM = "TA_CLE_API_ICI"; // ⚠️ Colle ta clé ici !

// Création de la couche des Nuages
const radarNuages = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${cleAPI_OWM}`, {
    opacity: 0.7, // Transparence pour voir la carte en dessous
    attribution: "Nuages © OpenWeatherMap"
});

// Création de la couche du Vent (Couleurs selon la force)
const radarVent = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${cleAPI_OWM}`, {
    opacity: 0.6,
    attribution: "Vent © OpenWeatherMap"
});

// On ajoute ces deux nouvelles couches au menu en haut à droite !
controleurDeCouches.addOverlay(radarNuages, "☁️ Couverture Nuageuse");
controleurDeCouches.addOverlay(radarVent, "💨 Vitesse du Vent");

// ==============================================================================
// INTERACTION : Écouter les clics sur la carte
// ==============================================================================
carte.on('click', async function(e) {
    // 1. Récupérer les coordonnées exactes du clic (arrondies à 2 décimales)
    const lat = e.latlng.lat.toFixed(2);
    const lon = e.latlng.lng.toFixed(2);

    console.log(`🌍 Clic détecté sur la carte : Lat ${lat}, Lon ${lon}`);

    // 2. Placer un marqueur visuel pour savoir où on a cliqué
    if (marqueurDynamique) {
        carte.removeLayer(marqueurDynamique); 
    }
    marqueurDynamique = L.marker([lat, lon]).addTo(carte)
        .bindPopup(`<b>Point Dynamique</b><br>Lat: ${lat}<br>Lon: ${lon}`).openPopup();

    // 3. Interroger ton serveur Python avec ces coordonnées
    try {
        const rep = await fetch(`https://dashboard-meteo.onrender.com/previsions?lat=${lat}&lon=${lon}`);
        const data = await rep.json();

        // 4. Mettre à jour le tableau avec les nouvelles données
        dessinerTableau(data.hourly, `Prévisions sur mesure (${lat}, ${lon})`, "dynamique");

    } catch (erreur) {
        console.error("❌ Erreur lors de la communication avec l'API locale :", erreur);
    }
});

// --- FONCTIONS DE COLORIMÉTRIE PASTEL ---
function bgTemp(t) { return t < 15 ? '#bae6fd' : t < 25 ? '#fef08a' : '#fecaca'; }
function bgVent(v) { return v < 15 ? '#bbf7d0' : v < 30 ? '#fed7aa' : '#fca5a5'; }
function couleurHoule(hauteur) {
    if (hauteur < 1.0) return '#4ade80';
    if (hauteur < 2.0) return '#facc15';
    if (hauteur < 3.0) return '#fb923c';
    return '#f87171';
}

// --- PARTIE 2 : LE MOTEUR DE LA CARTE (SNAPSHOT TEMPOREL) ---
function mettreAJourCarte(indexHeure) {
    if (!donneesMarinesGlobales) return;
    
    indexTemporelActuel = indexHeure;

    groupeFleches.clearLayers();
    const dateObj = new Date(donneesMarinesGlobales[0].hourly.time[indexHeure]);
    document.getElementById('label-heure').innerText = `Prévision : ${dateObj.toLocaleDateString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;

    // Petite fonction utilitaire pour traduire les degrés en texte
    function degreVersCardinale(angle) {
        const directions = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest"];
        return directions[Math.round((angle % 360) / 45) % 8];
    }

    donneesMarinesGlobales.forEach((bouee, index) => {
        const hHoule = bouee.hourly.wave_height[indexHeure];
        const dirHoule = bouee.hourly.wave_direction[indexHeure];
        const vitCourant = bouee.hourly.ocean_current_velocity[indexHeure];
        const dirCourant = bouee.hourly.ocean_current_direction[indexHeure];

        const iconeDouble = L.divIcon({
            className: 'icone-custom',
            html: `<div style="display: flex; gap: 4px; cursor: pointer; font-family: Arial, sans-serif; font-weight: 900;">
                    <div style="transform: rotate(${dirHoule}deg); font-size: ${Math.round(16 + (hHoule * 8))}px; color: ${couleurHoule(hHoule)}; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">↑</div>
                    <div style="transform: rotate(${dirCourant}deg); font-size: 16px; color: #60a5fa; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">↑</div>
                   </div>`,
            iconSize: [60, 40], iconAnchor: [30, 20]
        });

        const marqueur = L.marker([bouee.latitude, bouee.longitude], { icon: iconeDouble }).addTo(groupeFleches);
        
        // CORRECTION : Le retour de la bulle d'information complète !
        marqueur.bindPopup(`
            <div style="color: black;">
                <b style="font-size:1.1em;">📍 Bouée ${index + 1}</b><br>
                <hr style="margin:5px 0;">
                🌊 <b>Houle :</b> ${hHoule} m (${degreVersCardinale(dirHoule)})<br>
                🚤 <b>Courant :</b> ${vitCourant} km/h (${degreVersCardinale(dirCourant)})
            </div>
        `);

        marqueur.on('click', () => {
            idBoueeActive = index; 
            rafraichirTableauContextuel();
        });
    });

    if (idBoueeActive !== null) {
        rafraichirTableauContextuel();
    }
}
// --- PARTIE 3 : LE COMPOSANT TABLEAU INTERACTIF ET INTELLIGENT ---

// Petite fonction pour générer le HTML d'une cellule avec son surlignage éventuel
function genererCellule(donnee, couleurBg, indexCellule) {
    const estActive = (indexCellule === indexTemporelActuel);
    // CORRECTION : On utilise "inset" pour que la bordure jaune soit à l'intérieur
    // de la case et ne bave plus sur la colonne fixe de gauche.
    const styleActive = estActive ? "box-shadow: inset 0 0 0 3px #facc15; font-weight:bold; color:black;" : "";
    return `<td class="data-cell" style="background-color: ${couleurBg}; ${styleActive}">${donnee}</td>`;
}
// Fonction centrale de dessin du tableau
function dessinerTableau(hourlyData, nomDuSpot) {
    document.getElementById('titre-tableau').innerText = `📍 Prévisions Locales — ${nomDuSpot}`;

    if (!hourlyData || !hourlyData.time) {
        console.warn(`Données introuvables pour : ${nomDuSpot}`);
        alert(`Désolé, l'API n'a renvoyé aucune prévision pour ce lieu. Essayez un autre point !`);
        return; 
    }

    // 🌊 DÉTECTION INTELLIGENTE : Est-ce qu'on est en mer ?
    const estMarin = hourlyData.wave_height && hourlyData.wave_height.some(val => val !== null);
    
    // --- Logique Temporelle (Fenêtre glissante) ---
    const maintenant = new Date(); 
    let indexActuel = 0;
    for (let i = 0; i < hourlyData.time.length; i++) {
        if (new Date(hourlyData.time[i]) > maintenant) {
            indexActuel = Math.max(0, i - 1); 
            break;
        }
    }

    const indexDebut = Math.max(0, indexActuel - 3);
    const indexFin = Math.min(hourlyData.time.length - 1, indexActuel + 24);
    // ---------------------------------------------

    // ☁️ LIGNES DE BASE (Toujours affichées : Terre & Mer)
    let ligneHeures = `<tr><td class="colonne-fixe">Heure</td>`;
    let ligneTemp = `<tr><td class="colonne-fixe">Température (°C)</td>`;
    let ligneVent = `<tr><td class="colonne-fixe">Vent (km/h)</td>`;
    let ligneRafales = `<tr><td class="colonne-fixe">Rafales IA (km/h)</td>`;

    // 🌊 LIGNES BONUS (Affichées uniquement en Mer)
    let ligneHoule = estMarin ? `<tr><td class="colonne-fixe" style="background:#e0f2fe;">Houle (m)</td>` : "";
    let ligneDirHoule = estMarin ? `<tr><td class="colonne-fixe" style="background:#e0f2fe;">Dir. Houle (°)</td>` : "";
    let ligneCourant = estMarin ? `<tr><td class="colonne-fixe" style="background:#e0f2fe;">Courant (km/h)</td>` : "";

    for (let i = indexDebut; i <= indexFin; i++) {
        const estHeureActuelle = (i === indexActuel);
        const styleH = estHeureActuelle ? "color:#facc15; font-weight:bold; font-size:1.1em;" : "color:#94a3b8;";
        const heureTexte = hourlyData.time[i].split('T')[1]; 
        const affichageHeure = estHeureActuelle ? `${heureTexte}<br><span style="font-size:0.6em; color:#facc15;">Maintenant</span>` : heureTexte;
        
        ligneHeures += `<td style="${styleH}">${affichageHeure}</td>`;
        
        // Remplissage des données de base
        ligneTemp += genererCellule(hourlyData.temperature_2m[i], bgTemp(hourlyData.temperature_2m[i]), i);
        ligneVent += genererCellule(hourlyData.wind_speed_10m[i], bgVent(hourlyData.wind_speed_10m[i]), i);
        ligneRafales += genererCellule(hourlyData.rafales_ia[i], bgVent(hourlyData.rafales_ia[i]), i);

        // Remplissage des données marines en plus !
        if (estMarin) {
            ligneHoule += genererCellule(hourlyData.wave_height[i], couleurHoule(hourlyData.wave_height[i]), i);
            ligneDirHoule += genererCellule(hourlyData.wave_direction[i], '#e2e8f0', i); 
            ligneCourant += genererCellule(hourlyData.ocean_current_velocity[i], bgVent(hourlyData.ocean_current_velocity[i]), i);
        }
    }
    
    // Fermeture propre de toutes les balises <tr>
    ligneHeures += `</tr>`; ligneTemp += `</tr>`; ligneVent += `</tr>`; ligneRafales += `</tr>`;
    if (estMarin) { ligneHoule += `</tr>`; ligneDirHoule += `</tr>`; ligneCourant += `</tr>`; }

    // Assemblage final du code HTML
    let htmlFinal = ligneHeures + ligneTemp + ligneVent + ligneRafales;
    if (estMarin) { htmlFinal += ligneHoule + ligneDirHoule + ligneCourant; }

    document.getElementById('windguru-body').innerHTML = htmlFinal;
}

// Fonction de pilotage qui décide quoi afficher dans le tableau
async function rafraichirTableauContextuel() {
    try {
        if (idBoueeActive === null) {
            // Toulouse par défaut
            const rep = await fetch('https://dashboard-meteo.onrender.com/previsions?lat=43.60&lon=1.44');
            const data = await rep.json();
            dessinerTableau(data.hourly, "Toulouse (Terrestre - IA)", "terrestre");
        } else {
            // Une bouée marine
            const dataBouee = donneesMarinesGlobales[idBoueeActive];
            dessinerTableau(dataBouee.hourly, `Bouée ${idBoueeActive + 1} (Manche)`, "marin");
        }
    } catch (e) { console.error("Erreur Tableau:", e); }
}

// --- PARTIE 4 : INITIALISATION GLOBAL ---
async function demarrer() {
    try {
        // 1. Charger la carte et son slider
        const repMarine = await fetch('donnees_manche.json');
        donneesMarinesGlobales = await repMarine.json();
        mettreAJourCarte(0);
        document.getElementById('slider-temps').addEventListener('input', (e) => mettreAJourCarte(parseInt(e.target.value)));
        
        // 2. Charger le tableau par défaut
        rafraichirTableauContextuel();

        // 3. UX de fermeture : Si on ferme le popup, on reset Toulouse et l'état global
        carte.on('popupclose', () => {
            idBoueeActive = null;
            rafraichirTableauContextuel();
        });

    } catch (e) { console.error("Erreur Générale:", e); }
}

// ==========================================
// MOTEUR DE RECHERCHE : VILLE -> COORDONNÉES
// ==========================================
document.getElementById('btn-recherche').addEventListener('click', async () => {
    const ville = document.getElementById('input-ville').value;
    if (!ville) return; // Si le champ est vide, on ne fait rien

    try {
        // 1. Géocodage : on demande les coordonnées de la ville à OpenStreetMap
        const repGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${ville}`);
        const dataGeo = await repGeo.json();

        if (dataGeo.length === 0) {
            alert("Ville introuvable. Essayez de préciser (ex: Paris, France) !");
            return;
        }

        // On extrait la latitude et longitude du premier résultat
        const lat = parseFloat(dataGeo[0].lat).toFixed(2);
        const lon = parseFloat(dataGeo[0].lon).toFixed(2);
        console.log(`📍 Recherche : ${ville} -> Lat ${lat}, Lon ${lon}`);

        // 2. (Bonus UX) On déplace la vue de la carte sur la ville cherchée
        carte.setView([lat, lon], 11); 

        // 3. On interroge ton API Python avec ces nouvelles coordonnées
        const repMeteo = await fetch(`https://dashboard-meteo.onrender.com/previsions?lat=${lat}&lon=${lon}`);
        const dataMeteo = await repMeteo.json();

        // 4. On met à jour le tableau
        dessinerTableau(dataMeteo.hourly, `Prévisions : ${ville.toUpperCase()}`, "dynamique");

    } catch (erreur) {
        console.error("❌ Erreur lors de la recherche :", erreur);
    }
});

demarrer();