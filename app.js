// ==============================================================================
// DESTINATION : app.js (Version Pure Apple Météo - Fix Complet SSL & CORS)
// RÔLE : Carte dynamique, Géolocalisation, Couches Météo, Tableau intelligent
// ==============================================================================

// --- PARTIE 1 : INITIALISATION STYLE PROFESSIONNEL ---

const fondAppleMeteo = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20, attribution: '© OpenStreetMap, © CARTO'
});

const fondSombre = L.tileLayer('https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20, attribution: '© OpenStreetMap, © CARTO'
});

// Calque supérieur : Textes, frontières et repères géographiques (S'affiche AU-DESSUS de la météo)
const etiquettesFrontieres = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    pane: 'shadowPane' 
});

const carte = L.map('ma-carte', {
    center: [46.60, 2.00], 
    zoom: 5,
    layers: [fondAppleMeteo, etiquettesFrontieres] 
});

let marqueurDynamique = null;

// Textes sobres pour le menu
const couchesDeBase = { 
    "Carte Vierge": fondAppleMeteo
};
const couchesSuperposees = {
    "Afficher les repères": etiquettesFrontieres
}; 

const controleurDeCouches = L.control.layers(couchesDeBase, couchesSuperposees).addTo(carte);

// --- RADAR DE PLUIE ---
async function chargerRadarPluie() {
    try {
        const rep = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await rep.json();
        const derniereImage = data.radar.past[data.radar.past.length - 1];
        
        const radarPluie = L.tileLayer(`${data.host}${derniereImage.path}/256/{z}/{x}/{y}/0/1_1.png`, {
            opacity: 0.85, attribution: "RainViewer"
        });
        controleurDeCouches.addBaseLayer(radarPluie, "Précipitations");
    } catch (erreur) { console.error("Erreur RainViewer:", erreur); }
}
chargerRadarPluie();

// --- COUCHES OPENWEATHERMAP (Opacité renforcée pour des couleurs denses) ---
const radarNuages = L.tileLayer(`https://dashboard-meteo.onrender.com/cartes/clouds_new/{z}/{x}/{y}`, { 
    opacity: 0.90, attribution: "OWM" 
});
const radarVent = L.tileLayer(`https://dashboard-meteo.onrender.com/cartes/wind_new/{z}/{x}/{y}`, { 
    opacity: 0.90, attribution: "OWM",
    palette: "0:0000ff;5:00ffff;15:00ff00;25:ffff00;40:ffa500;60:ff0000" 
});
const radarTemp = L.tileLayer(`https://dashboard-meteo.onrender.com/cartes/temp_new/{z}/{x}/{y}`, {
    opacity: 0.90, // <-- Opacité très forte, car les repères s'afficheront par-dessus
    attribution: "OWM",
    palette: "-10:800080;0:0000ff;10:00ffff;20:00ff00;30:ffff00;35:ffa500;40:ff0000"
});

controleurDeCouches.addBaseLayer(radarNuages, "Couverture Nuageuse");
controleurDeCouches.addBaseLayer(radarVent, "Vents");
controleurDeCouches.addBaseLayer(radarTemp, "Températures");


// --- BOUTON GÉOLOCALISATION (Design Premium SVG) ---
const boutonGPS = L.control({ position: 'topleft' });
boutonGPS.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    // Remplacement du smiley par une icône SVG propre dans un bouton type "Verre fumé"
    div.innerHTML = `<button id="btn-gps" style="background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.15); width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);" title="Me localiser">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M2 12h2"></path><path d="M20 12h2"></path>
        </svg>
    </button>`;
    return div;
};
boutonGPS.addTo(carte);

document.getElementById('btn-gps').addEventListener('click', function() {
    if (!navigator.geolocation) return alert("Géolocalisation non supportée.");
    const bouton = document.getElementById('btn-gps');
    bouton.style.opacity = "0.5"; // Effet de chargement visuel
    
    navigator.geolocation.getCurrentPosition(
        function (position) {
            bouton.style.opacity = "1";
            const lat = position.coords.latitude.toFixed(2);
            const lon = position.coords.longitude.toFixed(2);
            carte.setView([lat, lon], 10);
            if (marqueurDynamique) carte.removeLayer(marqueurDynamique);
            marqueurDynamique = L.marker([lat, lon]).addTo(carte).bindPopup(`<b>Ma Position</b>`).openPopup();
            chargerMeteo(lat, lon, "Ma Position (GPS)");
        },
        function () { bouton.style.opacity = "1"; alert("Erreur GPS ou permission refusée."); }
    );
});

// ==============================================================================
// GESTIONNAIRE DE FONDS DE CARTE AUTOMATIQUE
// ==============================================================================
carte.on('baselayerchange', function(evenement) {
    if (evenement.name === "Vents" || evenement.name === "Températures" || evenement.name === "Couverture Nuageuse" || evenement.name === "Précipitations") {
        if (carte.hasLayer(fondAppleMeteo)) carte.removeLayer(fondAppleMeteo);
        if (!carte.hasLayer(fondSombre)) carte.addLayer(fondSombre);
    } else {
        if (carte.hasLayer(fondSombre)) carte.removeLayer(fondSombre);
        if (!carte.hasLayer(fondAppleMeteo)) carte.addLayer(fondAppleMeteo);
    }
    
    // On force les textes et frontières à rester au-dessus de la nouvelle couche
    if (carte.hasLayer(etiquettesFrontieres)) {
        etiquettesFrontieres.bringToFront();
    }
});

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

// --- PARTIE 3 : LE TABLEAU INTELLIGENT (Design Professionnel) ---

// Couleurs douces et pastel pour ne pas agresser l'œil
function bgTemp(t) { return t < 15 ? '#9ad7ff' : t < 25 ? '#fff47e' : '#ff8080'; }
function bgVent(v) { return v < 15 ? '#94ffba' : v < 30 ? '#ffd7a4' : '#ffa0a0'; }
function couleurHoule(h) { return h < 1.0 ? '#c7deff' : h < 2.0 ? '#77b2ff' : h < 3.0 ? '#1f64bd' : '#1a4684'; }

let indexActuelGlobal = 0; 
function genererCellule(donnee, couleurBg, indexCellule) {
    const estActive = (indexCellule === indexActuelGlobal);
    // Le surlignage de l'heure actuelle devient une bordure bleue élégante au lieu du jaune flash
    const styleActive = estActive ? "box-shadow: inset 0 0 0 2px #3b82f6; font-weight:bold; color:#1e293b;" : "color:#334155;";
    const affichage = donnee !== null ? donnee : "-";
    return `<td class="data-cell" style="background-color: ${couleurBg}; ${styleActive}">${affichage}</td>`;
}

function dessinerTableau(hourlyData, nomDuSpot) {
    // Titre sobre
    document.getElementById('titre-tableau').innerText = `Prévisions Locales : ${nomDuSpot}`;
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

    let ligneHeures = `<tr><td class="colonne-fixe" style="font-weight:600;">Heure</td>`;
    let ligneAlerte = `<tr><td class="colonne-fixe" style="font-weight:600; color:#ef4444;">Alerte Météo</td>`;
    let ligneTemp = `<tr><td class="colonne-fixe">Température (°C)</td>`;
    let ligneVent = `<tr><td class="colonne-fixe">Vent (km/h)</td>`;
    let ligneRafales = `<tr><td class="colonne-fixe">Rafales (km/h)</td>`;
    let ligneHoule = estMarin ? `<tr><td class="colonne-fixe">Houle (m)</td>` : "";
    let ligneDirHoule = estMarin ? `<tr><td class="colonne-fixe">Dir. Houle (°)</td>` : "";
    let ligneCourant = estMarin ? `<tr><td class="colonne-fixe">Courant (km/h)</td>` : "";

    for (let i = indexDebut; i <= indexFin; i++) {
        const estHeureActuelle = (i === indexActuelGlobal);
        const styleH = estHeureActuelle ? "color:#3b82f6; font-weight:700; font-size:1.05em;" : "color:#64748b;";
        const heureTexte = hourlyData.time[i].split('T')[1]; 
        const affichageHeure = estHeureActuelle ? `${heureTexte}<br><span style="font-size:0.7em; text-transform:uppercase;">Actuel</span>` : heureTexte;
        
        ligneHeures += `<td style="${styleH}; text-align:center;">${affichageHeure}</td>`;
        
        // --- LOGIQUE D'ALERTE (Sans emojis, très institutionnel) ---
        let texteAlerte = "-";
        let bgAlerte = "transparent";
        let couleurTexte = "inherit";
        
        const valCape = (hourlyData.cape && hourlyData.cape[i] !== null) ? hourlyData.cape[i] : 0;
        const valRafales = (hourlyData.rafales_ia && hourlyData.rafales_ia[i] !== null) ? hourlyData.rafales_ia[i] : 0;

        if (valCape > 1500) {
            texteAlerte = "ORAGE FORT"; bgAlerte = "#fef2f2"; couleurTexte = "#dc2626";
        } else if (valCape > 1000) {
            texteAlerte = "RISQUE ORAGE"; bgAlerte = "#fff7ed"; couleurTexte = "#ea580c";
        } else if (valRafales > 90) {
            texteAlerte = "TEMPÊTE"; bgAlerte = "#fef2f2"; couleurTexte = "#dc2626";
        } else if (valRafales > 70) {
            texteAlerte = "COUP DE VENT"; bgAlerte = "#fefce8"; couleurTexte = "#ca8a04";
        }
        
        const styleActiveA = estHeureActuelle ? "box-shadow: inset 0 0 0 2px #3b82f6;" : "";
        ligneAlerte += `<td class="data-cell" style="background-color:${bgAlerte}; color:${couleurTexte}; font-size:0.85em; font-weight:600; ${styleActiveA}">${texteAlerte}</td>`;
        // ---------------------------------------------

        ligneTemp += genererCellule(hourlyData.temperature_2m[i], bgTemp(hourlyData.temperature_2m[i]), i);
        ligneVent += genererCellule(hourlyData.wind_speed_10m[i], bgVent(hourlyData.wind_speed_10m[i]), i);
        ligneRafales += genererCellule(hourlyData.rafales_ia[i], bgVent(hourlyData.rafales_ia[i]), i);

        if (estMarin) {
            ligneHoule += genererCellule(hourlyData.wave_height[i], couleurHoule(hourlyData.wave_height[i]), i);
            ligneDirHoule += genererCellule(hourlyData.wave_direction[i], 'transparent', i); 
            ligneCourant += genererCellule(hourlyData.ocean_current_velocity[i], bgVent(hourlyData.ocean_current_velocity[i]), i);
        }
    }
    
    let htmlFinal = ligneHeures + "</tr>" + ligneAlerte + "</tr>" + ligneTemp + "</tr>" + ligneVent + "</tr>" + ligneRafales + "</tr>";
    if (estMarin) { htmlFinal += ligneHoule + "</tr>" + ligneDirHoule + "</tr>" + ligneCourant + "</tr>"; }
    
    document.getElementById('windguru-body').innerHTML = htmlFinal;
}

// --- PARTIE 4 : DÉMARRAGE ---
chargerMeteo(48.85, 2.35, "PARIS (Par défaut)");