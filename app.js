// ==============================================================================
// DESTINATION : app.js (Version Pro Finalisée avec Particules Animées)
// RÔLE : Carte dynamique, Géolocalisation, Couches Météo, Tableau intelligent
// ==============================================================================

// --- PARTIE 1 : INITIALISATION DE LA CARTE ---

// 1. Fond de carte Standard (Lumineux)
const fondOpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

// 2. NOUVEAU : Fond de carte Sombre Pro (Idéal pour faire ressortir la météo !)
const fondSombre = L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap, © CARTO'
});

const carte = L.map('ma-carte', {
    center: [46.60, 2.00], // Centré sur la France
    zoom: 5,
    layers: [fondSombre] // On charge le mode sombre par défaut pour le style météo
});

let marqueurDynamique = null;

// Menu des couches de base
const couchesDeBase = { 
    "🖤 Mode Sombre Météo": fondSombre,
    "🗺️ Carte Standard": fondOpenStreetMap 
};
const couchesSuperposees = {}; 
const controleurDeCouches = L.control.layers(couchesDeBase, couchesSuperposees).addTo(carte);

// --- RADAR DE PLUIE (RainViewer) ---
async function chargerRadarPluie() {
    try {
        const rep = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await rep.json();
        const derniereImage = data.radar.past[data.radar.past.length - 1];
        // Opacité poussée à 0.85 pour que la pluie soit bien visible
        const radarPluie = L.tileLayer(`${data.host}${derniereImage.path}/256/{z}/{x}/{y}/2/1_1.png`, {
            opacity: 0.85, 
            attribution: "Radar © RainViewer"
        });
        controleurDeCouches.addOverlay(radarPluie, "🌧️ Radar de Précipitations");
    } catch (erreur) { console.error("Erreur RainViewer:", erreur); }
}
chargerRadarPluie();

// --- COUCHES OPENWEATHERMAP (Sécurisées via Proxy + Opacité Maximale 💪) ---
const radarNuages = L.tileLayer(`https://dashboard-meteo.onrender.com/cartes/clouds_new/{z}/{x}/{y}`, { 
    opacity: 0.95, 
    attribution: "Nuages © OpenWeatherMap" 
});
const radarVent = L.tileLayer(`https://dashboard-meteo.onrender.com/cartes/wind_new/{z}/{x}/{y}`, { 
    opacity: 0.95, 
    attribution: "Vent © OpenWeatherMap" 
});
controleurDeCouches.addOverlay(radarNuages, "☁️ Couverture Nuageuse");
controleurDeCouches.addOverlay(radarVent, "💨 Vitesse du Vent");

// --- PARTIE 2 : INTERACTIONS (Clic & Recherche) ---

// Unification de l'appel au serveur Python (AVEC BOUCLIER ANTI-CRASH 🛡️)
async function chargerMeteo(lat, lon, nomDuSpot) {
    try {
        const rep = await fetch(`https://dashboard-meteo.onrender.com/previsions?lat=${lat}&lon=${lon}&t=${Date.now()}`);
        // 1. Vérification : est-ce que le serveur a renvoyé une erreur (ex: 500) ?
        if (!rep.ok) {
            throw new Error(`Le serveur a renvoyé une erreur HTTP ${rep.status}`);
        }

        const data = await rep.json();
        // 2. Affichage dans la console F12 pour nous aider à déboguer
        console.log(`📡 Réponse du serveur pour ${nomDuSpot} :`, data);
        // 3. Le Bouclier : on vérifie que "data" n'est pas nul et contient bien "hourly"
        if (!data || !data.hourly) {
            console.warn("⚠️ Données incomplètes ou nulles reçues du serveur !");
            alert(`Météo indisponible pour ce point : ${nomDuSpot}.`);
            return; 
        }

        // Si tout va bien, on dessine le tableau !
        dessinerTableau(data.hourly, nomDuSpot);
    } catch (erreur) { 
        console.error("❌ Erreur API Météo:", erreur);
    }
}

// Clic sur la carte
carte.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(2);
    const lon = e.latlng.lng.toFixed(2);
    
    if (marqueurDynamique) carte.removeLayer(marqueurDynamique);
    marqueurDynamique = L.marker([lat, lon]).addTo(carte).bindPopup(`<b>Point</b><br>Lat: ${lat}<br>Lon: ${lon}`).openPopup();
    
    chargerMeteo(lat, lon, `Spot sur mesure (${lat}, ${lon})`);
});

// Barre de recherche
document.getElementById('btn-recherche').addEventListener('click', async () => {
    const ville = document.getElementById('input-ville').value;
    if (!ville) return;

    try {
        const repGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${ville}`);
        const dataGeo = await repGeo.json();
        if (dataGeo.length === 0) return alert("Ville introuvable !");

        const lat = parseFloat(dataGeo[0].lat).toFixed(2);
        const lon = parseFloat(dataGeo[0].lon).toFixed(2);
        
        carte.setView([lat, lon], 11);
        if (marqueurDynamique) carte.removeLayer(marqueurDynamique);
        marqueurDynamique = L.marker([lat, lon]).addTo(carte).bindPopup(`<b>${ville.toUpperCase()}</b>`).openPopup();
        
        chargerMeteo(lat, lon, ville.toUpperCase());
    } catch (e) { console.error("Erreur Recherche:", e); }
});

// --- PARTIE 3 : LE TABLEAU INTELLIGENT ---

// Couleurs
function bgTemp(t) { return t < 15 ? '#bae6fd' : t < 25 ? '#fef08a' : '#fecaca'; }
function bgVent(v) { return v < 15 ? '#bbf7d0' : v < 30 ? '#fed7aa' : '#fca5a5'; }
function couleurHoule(h) { return h < 1.0 ? '#4ade80' : h < 2.0 ? '#facc15' : h < 3.0 ? '#fb923c' : '#f87171'; }

// Construction des cases du tableau
let indexActuelGlobal = 0; 
function genererCellule(donnee, couleurBg, indexCellule) {
    const estActive = (indexCellule === indexActuelGlobal);
    const styleActive = estActive ? "box-shadow: inset 0 0 0 3px #facc15; font-weight:bold; color:black;" : "";
    const affichage = donnee !== null ? donnee : "-";
    return `<td class="data-cell" style="background-color: ${couleurBg}; ${styleActive}">${affichage}</td>`;
}

// Dessin final du tableau (Avec Alertes Météo Extrêmes)
function dessinerTableau(hourlyData, nomDuSpot) {
    document.getElementById('titre-tableau').innerText = `📍 Prévisions Locales — ${nomDuSpot}`;
    if (!hourlyData || !hourlyData.time) return;

    const estMarin = hourlyData.wave_height && hourlyData.wave_height.some(val => val !== null);
    
    const maintenant = new Date();
    indexActuelGlobal = 0;
    
    for (let i = 0; i < hourlyData.time.length; i++) {
        if (new Date(hourlyData.time[i]) > maintenant) {
            indexActuelGlobal = Math.max(0, i - 1);
            break;
        }
    }

    const indexDebut = Math.max(0, indexActuelGlobal - 3);
    const indexFin = Math.min(hourlyData.time.length - 1, indexActuelGlobal + 24);

    let ligneHeures = `<tr><td class="colonne-fixe">Heure</td>`;
    // --- 🚨 NOUVELLE LIGNE ALERTE ---
    let ligneAlerte = `<tr><td class="colonne-fixe" style="font-weight:bold; background:#fff1f2;">Alerte Météo</td>`;
    let ligneTemp = `<tr><td class="colonne-fixe">Température (°C)</td>`;
    let ligneVent = `<tr><td class="colonne-fixe">Vent (km/h)</td>`;
    let ligneRafales = `<tr><td class="colonne-fixe">Rafales IA (km/h)</td>`;
    let ligneHoule = estMarin ? `<tr><td class="colonne-fixe" style="background:#e0f2fe;">Houle (m)</td>` : "";
    let ligneDirHoule = estMarin ? `<tr><td class="colonne-fixe" style="background:#e0f2fe;">Dir. Houle (°)</td>` : "";
    let ligneCourant = estMarin ? `<tr><td class="colonne-fixe" style="background:#e0f2fe;">Courant (km/h)</td>` : "";

    for (let i = indexDebut; i <= indexFin; i++) {
        const estHeureActuelle = (i === indexActuelGlobal);
        const styleH = estHeureActuelle ? "color:#facc15; font-weight:bold; font-size:1.1em;" : "color:#94a3b8;";
        const heureTexte = hourlyData.time[i].split('T')[1]; 
        const affichageHeure = estHeureActuelle ? `${heureTexte}<br><span style="font-size:0.6em; color:#facc15;">Maintenant</span>` : heureTexte;
        
        ligneHeures += `<td style="${styleH}">${affichageHeure}</td>`;
        
        // --- ⚡ LOGIQUE EXTRÊME (Orages & Tempêtes) ---
        let texteAlerte = "-";
        let bgAlerte = "transparent";
        
        const valCape = (hourlyData.cape && hourlyData.cape[i] !== null) ? hourlyData.cape[i] : 0;
        const valRafales = (hourlyData.rafales_ia && hourlyData.rafales_ia[i] !== null) ? hourlyData.rafales_ia[i] : 0;

        if (valCape > 1500) {
            texteAlerte = "⚡ Orage Violent"; bgAlerte = "#ef4444"; 
        } else if (valCape > 1000) {
            texteAlerte = "🌩️ Risque Orage"; bgAlerte = "#f97316"; 
        } else if (valRafales > 90) {
            texteAlerte = "🌪️ Tempête"; bgAlerte = "#ef4444"; 
        } else if (valRafales > 70) {
            texteAlerte = "⚠️ Coup de Vent"; bgAlerte = "#eab308"; 
        }
        
        ligneAlerte += genererCellule(texteAlerte, bgAlerte, i);

        ligneTemp += genererCellule(hourlyData.temperature_2m[i], bgTemp(hourlyData.temperature_2m[i]), i);
        ligneVent += genererCellule(hourlyData.wind_speed_10m[i], bgVent(hourlyData.wind_speed_10m[i]), i);
        ligneRafales += genererCellule(hourlyData.rafales_ia[i], bgVent(hourlyData.rafales_ia[i]), i);

        if (estMarin) {
            ligneHoule += genererCellule(hourlyData.wave_height[i], couleurHoule(hourlyData.wave_height[i]), i);
            ligneDirHoule += genererCellule(hourlyData.wave_direction[i], '#e2e8f0', i); 
            ligneCourant += genererCellule(hourlyData.ocean_current_velocity[i], bgVent(hourlyData.ocean_current_velocity[i]), i);
        }
    }
    
    let htmlFinal = ligneHeures + "</tr>" + ligneAlerte + "</tr>" + ligneTemp + "</tr>" + ligneVent + "</tr>" + ligneRafales + "</tr>";
    if (estMarin) { htmlFinal += ligneHoule + "</tr>" + ligneDirHoule + "</tr>" + ligneCourant + "</tr>"; }
    
    document.getElementById('windguru-body').innerHTML = htmlFinal;
} // <-- FIX 1 : La fonction dessinerTableau se ferme bien ici !

// ==============================================================================
// COUCHE ANIMÉE : Flux de vent style "Nullschool"
// ==============================================================================

async function chargerFluxVentAnime() {
    try {
        const rep = await fetch("https://onestatistics.github.io/leaflet-velocity/wind-gbr.json");
        const donneesVentBrutes = await rep.json();

        const coucheVentAnime = L.velocityLayer({
            displayValues: true,
            displayOptions: {
                velocityType: "Vent Global",
                position: "bottomleft", 
                emptyString: "Pas de vent détecté"
            },
            data: donneesVentBrutes, 
            maxVelocity: 15,         
            velocityScale: 0.005,    
            particleAge: 90,         
            particleMultiplier: 0.008, 
            colorScale: [            
                "rgb(36,104, 180)",
                "rgb(60,157, 194)",
                "rgb(128,205,193)",
                "rgb(151,218,168)",
                "rgb(252,217,125)",
                "rgb(252,141,89)",
                "rgb(215,48,39)"
            ]
        });

        controleurDeCouches.addOverlay(coucheVentAnime, "🌪️ Flux de Vent Animé");
    } catch (erreur) {
        console.error("❌ Impossible de charger l'animation de vent :", erreur);
    }
}

// Lancement de l'animation
chargerFluxVentAnime();

// --- PARTIE 4 : DÉMARRAGE ---
// Au chargement du site, on affiche la météo de Paris par défaut au lieu d'avoir un tableau vide !
chargerMeteo(48.85, 2.35, "PARIS (Par défaut)");
// <-- FIX 2 : Suppression de l'accolade en trop qui faisait crasher le script !