// ==============================================================================
// DESTINATION : app.js (Version Pure Apple Météo - Fix Complet SSL & CORS)
// RÔLE : Carte dynamique, Géolocalisation, Couches Météo, Tableau intelligent
// ==============================================================================

// --- PARTIE 1 : INITIALISATION STYLE AUTOMATIQUE "APPLE MÉTÉO" ---

// 1. Fond Clair Épuré (Idéal pour : Nuages et Précipitations)
const fondAppleMeteo = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap, © CARTO'
});

// 2. Fond Sombre Épuré (Idéal pour : Vents et Températures)
const fondSombre = L.tileLayer('https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap, © CARTO'
});

// 3. Les textes des villes (Placés au premier plan)
const etiquettesFrontieres = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    pane: 'shadowPane' 
});

// Au démarrage, on charge le fond clair et les textes
const carte = L.map('ma-carte', {
    center: [46.60, 2.00], 
    zoom: 5,
    layers: [fondAppleMeteo, etiquettesFrontieres] 
});

let marqueurDynamique = null;

// --- CONFIGURATION DU MENU UNIQUE STYLE APPLE ---
// Pour imiter Apple, on va mettre la météo dans les "Couches de Base" (Boutons radios). 
// Comme ça, l'utilisateur ne peut en choisir QU'UNE SEULE à la fois !
const couchesDeBase = { 
    "🗺️ Carte Vierge (Sans météo)": fondAppleMeteo
};
const couchesSuperposees = {
    "📌 Afficher les Villes": etiquettesFrontieres
}; 

const controleurDeCouches = L.control.layers(couchesDeBase, couchesSuperposees).addTo(carte);

// --- RADAR DE PLUIE (RainViewer) ---
async function chargerRadarPluie() {
    try {
        const rep = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await rep.json();
        const derniereImage = data.radar.past[data.radar.past.length - 1];
        
        const radarPluie = L.tileLayer(`${data.host}${derniereImage.path}/256/{z}/{x}/{y}/0/1_1.png`, {
            opacity: 0.70, attribution: "Radar © RainViewer"
        });
        
        // Ajout en choix unique
        controleurDeCouches.addBaseLayer(radarPluie, "🌧️ Précipitations");
    } catch (erreur) { console.error("Erreur RainViewer:", erreur); }
}
chargerRadarPluie();
// --- COUCHES OPENWEATHERMAP (Format Robuste et Segmenté) ---
const radarNuages = L.tileLayer(`https://dashboard-meteo.onrender.com/cartes/clouds_new/{z}/{x}/{y}`, { 
    opacity: 0.75, 
    attribution: "Nuages © OWM" 
});

// On passe la palette dans les configurations secondaires, Leaflet va la gérer proprement !
const radarVent = L.tileLayer(`https://dashboard-meteo.onrender.com/cartes/wind_new/{z}/{x}/{y}?palette={maPalette}`, { 
    opacity: 0.85, 
    attribution: "Vent © OWM",
    maPalette: "0:0000ff;5:00ffff;15:00ff00;25:ffff00;40:ffa500;60:ff0000" // Injection propre
});

const radarTemp = L.tileLayer(`https://dashboard-meteo.onrender.com/cartes/temp_new/{z}/{x}/{y}?palette={maPalette}`, {
    opacity: 0.70,
    attribution: "Température © OWM",
    maPalette: "-10:800080;0:0000ff;10:00ffff;20:00ff00;30:ffff00;35:ffa500;40:ff0000" // Injection propre
});

// On les injecte toutes en tant que "BaseLayer" pour imposer le choix unique !
controleurDeCouches.addBaseLayer(radarNuages, "☁️ Nuages");
controleurDeCouches.addBaseLayer(radarVent, "💨 Vents Vectoriels");
controleurDeCouches.addBaseLayer(radarTemp, "🌡️ Températures Thermiques");


// ==============================================================================
// 🧠 L'INTELLIGENCE APPLE MÉTÉO : Changement de fond automatique !
// ==============================================================================
carte.on('baselayerchange', function(evenement) {
    // Si l'utilisateur choisit le Vent ou la Température -> On force le Mode Sombre
    if (evenement.name === "💨 Vents Vectoriels" || evenement.name === "🌡️ Températures Thermiques") {
        if (carte.hasLayer(fondAppleMeteo)) carte.removeLayer(fondAppleMeteo);
        if (!carte.hasLayer(fondSombre)) carte.addLayer(fondSombre);
    } 
    // Si l'utilisateur choisit les Nuages, la Pluie ou la carte vierge -> On force le Mode Clair
    else {
        if (carte.hasLayer(fondSombre)) carte.removeLayer(fondSombre);
        if (!carte.hasLayer(fondAppleMeteo)) carte.addLayer(fondAppleMeteo);
    }
    
    // Astuce cruciale : on remet toujours les textes des villes au premier plan après la bascule
    if (carte.hasLayer(etiquettesFrontieres)) {
        etiquettesFrontieres.bringToFront();
    }
});

// --- 🎯 BOUTON GÉOLOCALISATION ---
const boutonGPS = L.control({ position: 'topleft' });
boutonGPS.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    div.innerHTML = `<button id="btn-gps" style="background: white; border: none; width: 34px; height: 34px; cursor: pointer; font-size: 1.3em; display: flex; align-items: center; justify-content: center; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.4);" title="Me localiser">🎯</button>`;
    return div;
};
boutonGPS.addTo(carte);

document.getElementById('btn-gps').addEventListener('click', function() {
    if (!navigator.geolocation) return alert("Géolocalisation non supportée par votre appareil.");
    
    const bouton = document.getElementById('btn-gps');
    bouton.innerText = "⏳";
    
    navigator.geolocation.getCurrentPosition(
        function (position) {
            bouton.innerText = "🎯";
            const lat = position.coords.latitude.toFixed(2);
            const lon = position.coords.longitude.toFixed(2);
            
            carte.setView([lat, lon], 10);
            if (marqueurDynamique) carte.removeLayer(marqueurDynamique);
            marqueurDynamique = L.marker([lat, lon]).addTo(carte).bindPopup(`<b>Ma Position</b>`).openPopup();
            
            chargerMeteo(lat, lon, "Ma Position (GPS)");
        },
        function () { bouton.innerText = "🎯"; alert("Erreur GPS ou permission refusée."); }
    );
});

// --- PARTIE 2 : INTERACTIONS (Clic & Recherche) ---

async function chargerMeteo(lat, lon, nomDuSpot) {
    try {
        const rep = await fetch(`https://dashboard-meteo.onrender.com/previsions?lat=${lat}&lon=${lon}&t=${Date.now()}`);
        if (!rep.ok) throw new Error(`Le serveur a renvoyé une erreur HTTP ${rep.status}`);

        const data = await rep.json();
        console.log(`📡 Réponse du serveur pour ${nomDuSpot} :`, data);
        if (!data || !data.hourly) {
            console.warn("⚠️ Données incomplètes ou nulles reçues du serveur !");
            alert(`Météo indisponible pour ce point : ${nomDuSpot}.`);
            return; 
        }

        dessinerTableau(data.hourly, nomDuSpot);
    } catch (erreur) { 
        console.error("❌ Erreur API Météo:", erreur);
    }
}

carte.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(2);
    const lon = e.latlng.lng.toFixed(2);
    
    if (marqueurDynamique) carte.removeLayer(marqueurDynamique);
    marqueurDynamique = L.marker([lat, lon]).addTo(carte).bindPopup(`<b>Point</b><br>Lat: ${lat}<br>Lon: ${lon}`).openPopup();
    
    chargerMeteo(lat, lon, `Spot sur mesure (${lat}, ${lon})`);
});

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

function bgTemp(t) { return t < 15 ? '#bae6fd' : t < 25 ? '#fef08a' : '#fecaca'; }
function bgVent(v) { return v < 15 ? '#bbf7d0' : v < 30 ? '#fed7aa' : '#fca5a5'; }
function couleurHoule(h) { return h < 1.0 ? '#4ade80' : h < 2.0 ? '#facc15' : h < 3.0 ? '#fb923c' : '#f87171'; }

let indexActuelGlobal = 0; 
function genererCellule(donnee, couleurBg, indexCellule) {
    const estActive = (indexCellule === indexActuelGlobal);
    const styleActive = estActive ? "box-shadow: inset 0 0 0 3px #facc15; font-weight:bold; color:black;" : "";
    const affichage = donnee !== null ? donnee : "-";
    return `<td class="data-cell" style="background-color: ${couleurBg}; ${styleActive}">${affichage}</td>`;
}

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
}

// --- PARTIE 4 : DÉMARRAGE ---
chargerMeteo(48.85, 2.35, "PARIS (Par défaut)");