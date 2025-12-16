// admin.js - Functie voor het laden en tonen van pakketten in admin.html

let packages = [];

document.addEventListener('DOMContentLoaded', function() {
    loadPackages();
});

async function loadPackages() {
    try {
        const response = await fetch('data/packages.json');
        packages = await response.json();
        displayPackages();
    } catch (error) {
        console.error('Fout bij laden pakketten:', error);
        document.getElementById('packagesList').innerHTML = 'Fout bij laden pakketten.';
    }
}

function displayPackages() {
    const list = document.getElementById('packagesList');
    list.innerHTML = `
        <table class="packages-table">
            <thead>
                <tr>
                    <th>Naam</th>
                    <th>Beschrijving</th>
                    <th>Uren</th>
                    <th>Prijs</th>
                    <th>Acties</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;
    const tbody = list.querySelector('tbody');
    packages.forEach(pkg => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pkg.name}</td>
            <td>${pkg.description}</td>
            <td>${pkg.hours}</td>
            <td>€${pkg.total_price}</td>
            <td>
                <button>Bewerken</button>
                <button>Verwijderen</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
