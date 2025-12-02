// assets/scripts/functions.js

/**
 * Haal pakketten uit de JSON en vul de dropdown
 */
async function loadPackages() {
    try {
        // Let op het pad: vanuit index.html gaan we naar assets/data/
        const response = await fetch('data/packages.json');
        const data = await response.json();
        
        const select = document.getElementById('packageSelect');
        select.innerHTML = '<option value="">-- Kies een pakket --</option>';

        data.forEach(pakket => {
            const option = document.createElement('option');
            option.value = pakket.id;
            // Tekst voorbeeld: "Kleine Tuin (4 uur) - €140"
            option.textContent = `${pakket.name} (${pakket.hours} uur) - €${pakket.total_price}`;
            select.appendChild(option);
        });

        console.log("Pakketten succesvol geladen.");

    } catch (error) {
        console.error("Fout bij laden pakketten:", error);
        alert("Er ging iets mis met het laden van de pakketten.");
    }
}

/**
 * Verwerk de order en toon feedback
 */
function createOrder(orderData) {
    console.log("--- NIEUWE AANVRAAG ---");
    console.log(orderData);
    
    // Simpele feedback voor week 3
    alert(`Bedankt ${orderData.klant.naam}!\nJe aanvraag staat nu op status: '${orderData.status}'.\nHenk neemt contact op via ${orderData.klant.email}.`);
}