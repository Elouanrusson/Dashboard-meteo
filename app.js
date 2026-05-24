// ==============================================================================
// DESTINATION : app.js (Version Pro Finalisée)
// RÔLE : Carte marine figée au Slider / Tableau contextuel avec surlignage.
// ==============================================================================

// --- PARTIE 1 : ÉTAT GLOBAL DE L'APPLICATION ---
const carte = L.map('ma-carte').setView([50.0, -0.5], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(carte);

let donneesMarinesGlobales = null;
// Mémorisation de l'heure active du slider (H+0 par défaut)
let indexTemporelActuel = 0; 
// Mémorisation du spot actif (Toulouse ou id de la bouée)
let idBoueeActive = null; 

const groupeFleches = L.layerGroup().addTo(carte);

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
function dessinerTableau(hourlyData, nomDuSpot, typeSpot) {
    document.querySelector('.module:nth-child(2) h2').innerText = `📍 Prévisions Locales — ${nomDuSpot}`;

    const estMarin = (typeSpot === 'marin');
    const heures = hourlyData.time.slice(0, 24);
    
    let ligneHeures = `<tr><td class="colonne-fixe">Heure</td>`;
    let ligne2 = `<tr><td class="colonne-fixe">${estMarin ? "Houle (m)" : "Température (°C)"}</td>`;
    let ligne3 = `<tr><td class="colonne-fixe">${estMarin ? "Courant (km/h)" : "Vent (km/h)"}</td>`;
    let ligne4 = `<tr><td class="colonne-fixe">${estMarin ? "Dir. Houle (°)" : "Rafales IA (km/h)"}</td>`;

    for (let i = 0; i < 24; i++) {
        // Ligne Heure (surlignage jaune du texte)
        const styleH = (i === indexTemporelActuel) ? "color:#facc15; font-weight:bold; font-size:1.1em;" : "color:#94a3b8;";
        ligneHeures += `<td style="${styleH}">${heures[i].split('T')[1]}</td>`;
        
        // Lignes de données (surlignage de la bordure de cellule)
        if (estMarin) {
            ligne2 += genererCellule(hourlyData.wave_height[i], couleurHoule(hourlyData.wave_height[i]), i);
            ligne3 += genererCellule(hourlyData.ocean_current_velocity[i], bgVent(hourlyData.ocean_current_velocity[i]), i);
            ligne4 += genererCellule(hourlyData.wave_direction[i], '#e2e8f0', i); // Gris neutre pour angle
        } else {
            ligne2 += genererCellule(hourlyData.temperature_2m[i], bgTemp(hourlyData.temperature_2m[i]), i);
            ligne3 += genererCellule(hourlyData.wind_speed_10m[i], bgVent(hourlyData.wind_speed_10m[i]), i);
            ligne4 += genererCellule(hourlyData.wind_gusts_10m[i], bgVent(hourlyData.wind_gusts_10m[i]), i);
        }
    }
    document.getElementById('windguru-body').innerHTML = ligneHeures + `</tr>` + ligne2 + `</tr>` + ligne3 + `</tr>` + ligne4 + `</tr>`;
}

// Fonction de pilotage qui décide quoi afficher dans le tableau
async function rafraichirTableauContextuel() {
    try {
        if (idBoueeActive === null) {
            // Toulouse par défaut
            const rep = await fetch('http://127.0.0.1:8000/previsions?lat=43.60&lon=1.44');
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

demarrer();