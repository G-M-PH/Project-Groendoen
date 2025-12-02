// assets/scripts/script.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Laad de pakketten direct in de lijst
if (window.location.pathname === "/pakketten.html") {
  loadPackages();
}

    // 2. Luister naar het formulier
    const form = document.getElementById('orderForm');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Stop standaard verzenden

            // Haal alle waarden op
            const name = document.getElementById('name').value;
            const address = document.getElementById('address').value;
            const zipcity = document.getElementById('zipcity').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const date = document.getElementById('date').value;
            const packageId = document.getElementById('packageSelect').value;

            // Maak het object volgens de wensen van Henk
            const newOrder = {
                id: Date.now(), // Tijdelijk ID
                klant: {
                    naam: name,
                    adres: address,
                    plaats: zipcity,
                    email: email,
                    telefoon: phone
                },
                datum_voorkeur: date,
                pakketId: packageId,
                status: "In afwachting" // De verplichte start-status
            };

            // Roep de functie aan
            createOrder(newOrder);
        });
    }
});


loadPage("header", "header.html");
loadPage("footer", "footer.html");