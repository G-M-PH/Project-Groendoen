// scripts/admin.js

async function fetchOrders() {
    try {
        const res = await fetch('data/orders.json');
        const initial = await res.json();

        // Merge with locally saved orders so admin changes persist
        const saved = JSON.parse(localStorage.getItem('ggd_orders') || 'null');
        if (!saved) {
            localStorage.setItem('ggd_orders', JSON.stringify(initial));
            return initial;
        }

        // saved exists: prefer saved (it may contain edits), but ensure any new initial are added
        const mapSaved = new Map(saved.map(o => [o.id, o]));
        initial.forEach(o => {
            if (!mapSaved.has(o.id)) mapSaved.set(o.id, o);
        });
        const merged = Array.from(mapSaved.values());
        localStorage.setItem('ggd_orders', JSON.stringify(merged));
        return merged;
    } catch (err) {
        console.error('Kon orders niet laden', err);
        return [];
    }
}

function saveOrdersLocal(orders) {
    localStorage.setItem('ggd_orders', JSON.stringify(orders));
}

function renderOrders(orders) {
    const container = document.getElementById('ordersList');
    if (!container) return;
    if (!orders.length) {
        container.innerHTML = '<p>Geen aanvragen gevonden.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'orders-table';
    table.innerHTML = `
        <thead>
            <tr><th>ID</th><th>Klant</th><th>Adres</th><th>Datum</th><th>Pakket</th><th>Prijs</th><th>Status</th><th>Acties</th></tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    orders.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${o.id}</td>
            <td>${o.klant.naam}<br><small>${o.klant.email}</small></td>
            <td>${o.klant.address}</td>
            <td>${o.preferredDate || '-'} </td>
            <td>${o.pakket}</td>
            <td>€ <span class="price">${o.price}</span></td>
            <td class="status">${o.status}</td>
            <td class="actions"></td>
        `;

        const actions = tr.querySelector('.actions');

        const approveBtn = document.createElement('button');
        approveBtn.textContent = 'Goedkeuren';
        approveBtn.className = 'btn-green';
        approveBtn.addEventListener('click', () => updateOrderStatus(o.id, 'Goedgekeurd'));

        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = 'Afkeuren';
        rejectBtn.className = 'btn-red';
        rejectBtn.style.marginLeft = '8px';
        rejectBtn.addEventListener('click', () => updateOrderStatus(o.id, 'Afgekeurd'));

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Prijs / Notitie';
        editBtn.className = 'btn-secondary';
        editBtn.style.marginLeft = '8px';
        editBtn.addEventListener('click', () => editOrder(o.id));

        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Meer';
        viewBtn.className = 'btn-secondary';
        viewBtn.style.marginLeft = '8px';
        viewBtn.addEventListener('click', () => showOrderDetails(o.id));

        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);
        actions.appendChild(editBtn);
        actions.appendChild(viewBtn);

        tbody.appendChild(tr);
    });

    container.innerHTML = '';
    container.appendChild(table);
}

function updateOrderStatus(id, newStatus) {
    const orders = JSON.parse(localStorage.getItem('ggd_orders') || '[]');
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return alert('Order niet gevonden');
    orders[idx].status = newStatus;
    saveOrdersLocal(orders);
    renderOrders(orders);
    renderCalendar(orders);
}

function editOrder(id) {
    const orders = JSON.parse(localStorage.getItem('ggd_orders') || '[]');
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return alert('Order niet gevonden');

    const order = orders[idx];
    const newPrice = prompt('Nieuwe prijs (euro):', order.price || 0);
    if (newPrice !== null) {
        const parsed = parseFloat(newPrice);
        if (!isNaN(parsed)) order.price = parsed;
    }
    const newNotes = prompt('Aanvullende notities:', order.notes || '');
    if (newNotes !== null) order.notes = newNotes;
    const newHours = prompt('Uren voor deze klus (optioneel):', order.hours || '');
    if (newHours !== null && newHours !== '') {
        const ph = parseFloat(newHours);
        if (!isNaN(ph)) order.hours = ph;
    }

    orders[idx] = order;
    saveOrdersLocal(orders);
    renderOrders(orders);
}

function renderCalendar(orders) {
    const cal = document.getElementById('calendar');
    if (!cal) return;

    // keep month/year state in closure
    if (typeof renderCalendar.currentYear === 'undefined') {
        const t = new Date();
        renderCalendar.currentYear = t.getFullYear();
        renderCalendar.currentMonth = t.getMonth();
    }

    // accept optional year/month
    const year = arguments[1] ?? renderCalendar.currentYear;
    const month = arguments[2] ?? renderCalendar.currentMonth;

    renderCalendar.currentYear = year;
    renderCalendar.currentMonth = month;

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    // build calendar container
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    // nav header with prev/next
    const nav = document.createElement('div'); nav.className = 'calendar-nav';
    const prev = document.createElement('button'); prev.className = 'btn-secondary'; prev.textContent = '‹';
    const next = document.createElement('button'); next.className = 'btn-secondary'; next.textContent = '›';
    const label = document.createElement('div'); label.className = 'calendar-header'; label.innerHTML = `<strong>${first.toLocaleString('nl-NL', { month: 'long' })} ${year}</strong>`;
    nav.appendChild(prev); nav.appendChild(label); nav.appendChild(next);
    grid.appendChild(nav);

    // weekdays
    const daysRow = document.createElement('div');
    daysRow.className = 'calendar-weekdays';
    ['Zo','Ma','Di','Wo','Do','Vr','Za'].forEach(d => {
        const el = document.createElement('div'); el.className='weekday'; el.textContent = d; daysRow.appendChild(el);
    });
    grid.appendChild(daysRow);

    const cells = document.createElement('div');
    cells.className = 'calendar-cells';

    // empty cells before first day
    for (let i=0;i<first.getDay();i++){
        const empty = document.createElement('div'); empty.className='calendar-cell empty'; cells.appendChild(empty);
    }

    for (let d=1; d<=last.getDate(); d++){
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        cell.setAttribute('data-date', dateStr);
        cell.innerHTML = `<div class="date-num">${d}</div>`;

        // find orders for this date (any status)
        const ordersForDay = orders.filter(o => o.preferredDate === dateStr);
        // estimate hours per order using package info when possible
        const pkgs = JSON.parse(localStorage.getItem('ggd_packages') || '[]');
        function estimateHours(o) {
            if (o.hours) return Number(o.hours);
            // try match by package id or name
            const p = pkgs.find(x => x.id === o.pakket || x.name === o.pakket);
            if (p && p.hours) return Number(p.hours);
            if (o.m2) return Math.max(1, Math.round(Number(o.m2) / 5));
            return 2; // fallback
        }
        const totalHours = ordersForDay.reduce((s, it) => s + estimateHours(it), 0);
        const capacity = 8;
        const capHtml = `<div class="capacity-badge ${totalHours>capacity? 'overbooked' : ''}">${totalHours}h / ${capacity}h</div>`;
        cell.innerHTML += capHtml;
        if (ordersForDay.length) {
            const list = document.createElement('ul');
            list.className = 'calendar-orders';
            ordersForDay.forEach(o => {
                const li = document.createElement('li');
                li.textContent = `${o.klant.naam} — €${o.price} — ${o.status} — ${estimateHours(o)}h`;
                list.appendChild(li);
            });
            cell.appendChild(list);
            cell.classList.add('has-order');
        }

        // click opens date modal with details
        cell.addEventListener('click', (ev) => {
            ev.stopPropagation();
            showDateModal(dateStr);
        });

        cells.appendChild(cell);
    }

    grid.appendChild(cells);
    cal.innerHTML = '';
    cal.appendChild(grid);

    // wire prev/next
    prev.addEventListener('click', () => {
        let ny = renderCalendar.currentYear;
        let nm = renderCalendar.currentMonth - 1;
        if (nm < 0) { nm = 11; ny -= 1; }
        renderCalendar(orders, ny, nm);
    });
    next.addEventListener('click', () => {
        let ny = renderCalendar.currentYear;
        let nm = renderCalendar.currentMonth + 1;
        if (nm > 11) { nm = 0; ny += 1; }
        renderCalendar(orders, ny, nm);
    });
}

async function initAdmin() {
    // require admin auth first
    await requireAdminAuth();
    const orders = await fetchOrders();
    renderOrders(orders);
    renderCalendar(orders);
}

initAdmin();

/* ------------------ Pakketbeheer (client-side, localStorage) ------------------ */

async function fetchPackages() {
    try {
        const res = await fetch('data/packages.json');
        const initial = await res.json();

        const saved = JSON.parse(localStorage.getItem('ggd_packages') || 'null');
        if (!saved) {
            localStorage.setItem('ggd_packages', JSON.stringify(initial));
            return initial;
        }

        // merge any new initial packages
        const mapSaved = new Map(saved.map(p => [p.id, p]));
        initial.forEach(p => { if (!mapSaved.has(p.id)) mapSaved.set(p.id, p); });
        const merged = Array.from(mapSaved.values());
        localStorage.setItem('ggd_packages', JSON.stringify(merged));
        return merged;
    } catch (err) {
        console.error('Kon pakketten niet laden', err);
        return [];
    }
}

function savePackagesLocal(packages) {
    localStorage.setItem('ggd_packages', JSON.stringify(packages));
}

function renderPackagesEditor(packages) {
    const list = document.getElementById('packagesList');
    if (!list) return;
    if (!packages.length) {
        list.innerHTML = '<p>Geen pakketten gevonden.</p>';
    } else {
        const table = document.createElement('table');
        table.className = 'orders-table';
        table.innerHTML = `<thead><tr><th>Naam</th><th>Uren</th><th>Prijs</th><th>Omschrijving</th><th>Acties</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        packages.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.name}</td><td>${p.hours}</td><td>€ ${p.total_price}</td><td>${p.description || ''}</td><td class="pkg-actions"></td>`;
            const actions = tr.querySelector('.pkg-actions');

            const editBtn = document.createElement('button'); editBtn.className='btn-secondary'; editBtn.textContent='Bewerken';
            editBtn.addEventListener('click', () => editPackage(p.id));
            const delBtn = document.createElement('button'); delBtn.className='btn-red'; delBtn.textContent='Verwijderen'; delBtn.style.marginLeft='8px';
            delBtn.addEventListener('click', () => deletePackage(p.id));

            actions.appendChild(editBtn); actions.appendChild(delBtn);
            tbody.appendChild(tr);
        });
        list.innerHTML = ''; list.appendChild(table);
    }

    // wire add form
    const form = document.getElementById('addPackageForm');
    if (form) {
        form.removeEventListener('submit', onAddPackageSubmit);
        form.addEventListener('submit', onAddPackageSubmit);
    }
}

function onAddPackageSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('pkgName').value.trim();
    const hours = parseFloat(document.getElementById('pkgHours').value) || 0;
    const total = parseFloat(document.getElementById('pkgPrice').value) || 0;
    const desc = document.getElementById('pkgDesc').value.trim();

    const id = 'pkg-' + Date.now().toString(36);
    const pkg = { id: id, name: name, hours: hours, total_price: total, description: desc };
    const packages = JSON.parse(localStorage.getItem('ggd_packages') || '[]');
    packages.push(pkg);
    savePackagesLocal(packages);
    renderPackagesEditor(packages);
    // clear form
    e.target.reset();
}

function editPackage(id) {
    const packages = JSON.parse(localStorage.getItem('ggd_packages') || '[]');
    const idx = packages.findIndex(p => p.id === id);
    if (idx === -1) return alert('Pakket niet gevonden');
    const p = packages[idx];
    const newName = prompt('Naam:', p.name);
    if (newName !== null) p.name = newName;
    const newHours = prompt('Uren:', p.hours);
    if (newHours !== null && !isNaN(parseFloat(newHours))) p.hours = parseFloat(newHours);
    const newPrice = prompt('Totale prijs:', p.total_price);
    if (newPrice !== null && !isNaN(parseFloat(newPrice))) p.total_price = parseFloat(newPrice);
    const newDesc = prompt('Omschrijving:', p.description || '');
    if (newDesc !== null) p.description = newDesc;
    packages[idx] = p;
    savePackagesLocal(packages);
    renderPackagesEditor(packages);
}

function deletePackage(id) {
    if (!confirm('Weet je zeker dat je dit pakket wilt verwijderen?')) return;
    let packages = JSON.parse(localStorage.getItem('ggd_packages') || '[]');
    packages = packages.filter(p => p.id !== id);
    savePackagesLocal(packages);
    renderPackagesEditor(packages);
}

// init packages editor on admin page
fetchPackages().then(pkgs => renderPackagesEditor(pkgs));

/* ------------------ Admin auth (client-side) ------------------ */

function isAdminAuthenticated() {
    return sessionStorage.getItem('ggd_admin_auth') === '1';
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('modal-show');
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden','true');
    modal.classList.remove('modal-show');
}

function requireAdminAuth() {
    return new Promise(resolve => {
        if (isAdminAuthenticated()) return resolve();
        showLoginModal();
        const form = document.getElementById('loginForm');
        const close = document.getElementById('loginClose');
        const handler = (e) => {
            e.preventDefault();
            const pw = document.getElementById('adminPassword').value;
            // simple client-side password (change to something secret for Henk)
            if (pw === 'admin') {
                sessionStorage.setItem('ggd_admin_auth','1');
                hideLoginModal();
                form.removeEventListener('submit', handler);
                resolve();
            } else {
                alert('Wachtwoord onjuist');
            }
        };
        form.addEventListener('submit', handler);
        close.addEventListener('click', () => { hideLoginModal(); });
    });
}

/* ------------------ Order details modal & scheduling ------------------ */

function showOrderDetails(id) {
    const orders = JSON.parse(localStorage.getItem('ggd_orders') || '[]');
    const o = orders.find(x => x.id === id);
    if (!o) return alert('Order niet gevonden');

    const container = document.getElementById('orderModalContent');
    container.innerHTML = `
        <h2>Order ${o.id}</h2>
        <p><strong>Klant:</strong> ${o.klant.naam} — ${o.klant.email} — ${o.klant.phone}</p>
        <p><strong>Adres:</strong> ${o.klant.address}</p>
        <p><strong>Pakket:</strong> ${o.pakket}</p>
        <p><strong>Voorkeursdatum:</strong> ${o.preferredDate || '-'}</p>
        <p><strong>M²:</strong> ${o.m2 || '-'} </p>
        <p><strong>Notities:</strong> ${o.notes || '-'}</p>
        <p><strong>Status:</strong> <span class="status">${o.status}</span></p>
        <hr/>
        <div class="form-row">
            <div class="form-group">
                <label for="scheduleDate">Plan datum:</label>
                <input id="scheduleDate" type="date" value="${o.preferredDate || ''}" />
            </div>
            <div class="form-group">
                <label for="orderHours">Uren (handmatig)</label>
                <input id="orderHours" type="number" min="0" step="0.5" value="${o.hours || ''}" />
            </div>
        </div>
        <div style="margin-top:8px">
            <button id="saveSchedule" class="btn-green">Inplannen / Opslaan</button>
            <button id="closeOrderModal" class="btn-secondary" style="margin-left:8px">Sluit</button>
        </div>
    `;

    const modal = document.getElementById('orderModal');
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('modal-show');

    document.getElementById('closeOrderModal').addEventListener('click', () => {
        modal.setAttribute('aria-hidden','true');
        modal.classList.remove('modal-show');
    });

    document.getElementById('saveSchedule').addEventListener('click', () => {
        const date = document.getElementById('scheduleDate').value;
        const hoursVal = document.getElementById('orderHours') ? document.getElementById('orderHours').value : '';
        const orders = JSON.parse(localStorage.getItem('ggd_orders') || '[]');
        const idx = orders.findIndex(x => x.id === id);
        if (idx === -1) return alert('Order niet gevonden');
        orders[idx].preferredDate = date;
        if (hoursVal !== '') {
            const hh = parseFloat(hoursVal);
            if (!isNaN(hh)) orders[idx].hours = hh;
        }
        orders[idx].status = 'Ingepland';
        localStorage.setItem('ggd_orders', JSON.stringify(orders));
        renderOrders(orders);
        renderCalendar(orders);
        // close
        modal.setAttribute('aria-hidden','true');
        modal.classList.remove('modal-show');
    });
}

// wire order modal close button (defensive — only if element exists)
document.addEventListener('DOMContentLoaded', () => {
    const orderCloseBtn = document.getElementById('orderClose');
    if (orderCloseBtn) orderCloseBtn.addEventListener('click', () => {
        const modal = document.getElementById('orderModal');
        modal.setAttribute('aria-hidden','true'); modal.classList.remove('modal-show');
    });
});

// react to storage changes (other tabs) or programmatic storage events
window.addEventListener('storage', async (e) => {
    try {
        const orders = JSON.parse(localStorage.getItem('ggd_orders') || '[]');
        renderOrders(orders);
        renderCalendar(orders);
    } catch (err) { console.error('Error reloading orders after storage event', err); }
});

// also listen to a custom storage-like event dispatched in same tab
window.addEventListener('storage', async () => {});

function showDateModal(dateStr) {
    const orders = JSON.parse(localStorage.getItem('ggd_orders') || '[]');
    const ordersForDay = orders.filter(o => o.preferredDate === dateStr);
    const container = document.getElementById('orderModalContent');
    const parts = [];
    parts.push(`<h2>${dateStr}</h2>`);
    if (!ordersForDay.length) parts.push('<p>Geen bestellingen voor deze datum.</p>');
    else {
        parts.push('<ul>');
        ordersForDay.forEach(o => {
            parts.push(`<li>${o.klant.naam} — ${o.pakket} — €${o.price} — ${o.status} <button class="btn-secondary" data-order-id="${o.id}">Bekijk</button></li>`);
        });
        parts.push('</ul>');
    }

    parts.push('<hr/>');
    parts.push('<h3>Handmatige blokkering / notitie toevoegen</h3>');
    parts.push('<div class="form-group"><label>Titel</label><input id="blockTitle" /></div>');
    parts.push('<div style="margin-top:8px"><button id="addBlock" class="btn-green">Toevoegen</button> <button id="closeDateModal" class="btn-secondary" style="margin-left:8px">Sluit</button></div>');

    container.innerHTML = parts.join('');
    const modal = document.getElementById('orderModal');
    modal.setAttribute('aria-hidden','false'); modal.classList.add('modal-show');

    // wire view buttons
    container.querySelectorAll('button[data-order-id]').forEach(b => {
        b.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-order-id');
            showOrderDetails(id);
        });
    });

    document.getElementById('closeDateModal').addEventListener('click', () => {
        modal.setAttribute('aria-hidden','true'); modal.classList.remove('modal-show');
    });

    document.getElementById('addBlock').addEventListener('click', () => {
        const title = document.getElementById('blockTitle').value.trim() || 'Geblokkeerd';
        const orders = JSON.parse(localStorage.getItem('ggd_orders') || '[]');
        const id = 'blk-' + Date.now().toString(36);
        const block = { id: id, klant: { naam: 'Handmatig' }, pakket: title, preferredDate: dateStr, m2: 0, notes: 'Handmatige blokkering', status: 'Geblokkeerd', price: 0 };
        orders.push(block);
        localStorage.setItem('ggd_orders', JSON.stringify(orders));
        renderOrders(orders);
        renderCalendar(orders);
        modal.setAttribute('aria-hidden','true'); modal.classList.remove('modal-show');
    });
}
