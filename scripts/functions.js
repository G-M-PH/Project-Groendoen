// scripts/functions.js

// Rates for custom-offerte (simple, changeable)
const RATES = {
    gras_per_m2: 0.8,
    heg_per_m: 2.5,
    onkruid_per_m2: 1.0,
    snoei_per_hour: 25,
    afvoer_per_m3: 15
};

async function loadPackages() {
    try {
        // prefer packages saved in localStorage (admin edits); fallback to data file
        const saved = JSON.parse(localStorage.getItem('ggd_packages') || 'null');
        let data = [];
        if (saved) data = saved;
        else {
            const response = await fetch('data/packages.json');
            data = await response.json();
        }

        const select = document.getElementById('packageSelect');
        if (!select) return;
        select.innerHTML = '<option value="">-- Kies een pakket --</option>';

        data.forEach(pakket => {
            const option = document.createElement('option');
            option.value = pakket.id || pakket.name;
            option.textContent = `${pakket.name} (${pakket.hours || 0} uur) - €${pakket.total_price}`;
            select.appendChild(option);
        });

        // also render a compact packages list for the form
        const small = document.getElementById('packagesListSmall');
        if (small) {
            small.innerHTML = '';
            data.forEach(p => {
                const card = document.createElement('div'); card.className = 'card';
                card.innerHTML = `<h4>${p.name}</h4><p>${p.description||''}</p><p><strong>€ ${p.total_price}</strong></p>`;
                small.appendChild(card);
            });
        }

        console.log('Pakketten succesvol geladen.');
        // initialize custom UI now that packages and DOM are present
        try { toggleOrderTypeUI(); setupCustomUI(); updateCustomEstimateDisplay(); } catch (e) {}
    } catch (error) {
        console.error('Fout bij laden pakketten:', error);
    }
}

function createOrder(orderData) {
    console.log('--- NIEUWE AANVRAAG ---');
    console.log(orderData);

    // save to localStorage so admin can see it
    const existing = JSON.parse(localStorage.getItem('ggd_orders') || 'null');
    const orders = Array.isArray(existing) ? existing : [];
    const id = 'ord-' + Date.now().toString(36);
    const order = {
        id: id,
        klant: {
            naam: orderData.klant.naam,
            email: orderData.klant.email,
            phone: orderData.klant.phone,
            address: orderData.klant.address
        },
        pakket: orderData.pakket,
        preferredDate: orderData.voorkeur || '',
        m2: orderData.m2 || null,
        notes: orderData.notes || '',
        status: 'In afwachting van goedkeuring',
        price: orderData.price || 0
    };
    orders.push(order);
    localStorage.setItem('ggd_orders', JSON.stringify(orders));

    // dispatch a storage-event-like update for same-tab listeners
    try { window.dispatchEvent(new Event('storage')); } catch(e){}
    // show a nicer success modal instead of alert
    try { showSuccessModal(order); } catch (e) { alert(`Bedankt ${order.klant.naam}!\nJe aanvraag is verzonden en staat op status: '${order.status}'.`); }
}

function showSuccessModal(order) {
    const modal = document.getElementById('successModal');
    const msg = document.getElementById('successMessage');
    if (!modal) { alert('Aanvraag verzonden'); return; }
    if (msg) {
        const name = order.klant?.naam || '';
        const price = order.price ? `Geschatte prijs: €${order.price}` : '';
        msg.textContent = `Bedankt ${name}! Uw aanvraag is verzonden. ${price}`.trim();
    }
    modal.classList.add('modal-show');
    modal.setAttribute('aria-hidden','false');

    // close handlers
    const close = document.getElementById('successClose');
    const ok = document.getElementById('successOk');
    function hide() { modal.classList.remove('modal-show'); modal.setAttribute('aria-hidden','true'); }
    if (close) close.onclick = hide;
    if (ok) ok.onclick = hide;
    modal.onclick = (e) => { if (e.target === modal) hide(); };
}

function setupNavToggle() {
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('mainNav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
        nav.classList.toggle('show');
    });
}

function highlightActiveLink() {
    const links = document.querySelectorAll('.main-nav a');
    const path = location.pathname.split('/').pop() || 'index.html';
    links.forEach(a => {
        const href = a.getAttribute('href');
        if (href === path) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}

function setupForm() {
    const form = document.getElementById('orderForm');
    if (!form) return;

    // clear errors on input
    ['name','email','address','zipcity','m2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => clearFieldError(el));
    });

    // submit handler with validation
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // run validation
        if (!validateOrderForm()) {
            // focus first invalid field
            const first = form.querySelector('.input-invalid');
            if (first) first.focus();
            return;
        }

        const order = {
            klant: {
                naam: document.getElementById('name').value,
                address: document.getElementById('address').value,
                zipcity: document.getElementById('zipcity').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value
            },
            voorkeur: document.getElementById('date').value,
            pakket: document.getElementById('packageSelect').value,
            m2: document.getElementById('m2') ? Number(document.getElementById('m2').value) : null,
            notes: document.getElementById('notes') ? document.getElementById('notes').value : '',
            status: 'In afwachting van goedkeuring'
        };

        // check whether user chose custom or package
        const type = document.querySelector('input[name="orderType"]:checked')?.value || 'package';
        if (type === 'custom') {
            // build custom details from checked options
            const opts = Array.from(document.querySelectorAll('.opt')).map(cb => {
                const key = cb.getAttribute('data-key');
                const qtyInput = document.querySelector(`.opt-qty[data-key="${key}"]`);
                const qty = qtyInput ? Number(qtyInput.value) : 0;
                return { key, checked: cb.checked, qty };
            }).filter(x => x.checked && x.qty > 0);
            const estimate = calculateCustomEstimate(opts);
            order.price = estimate;
            order.custom = opts;
            order.customNotes = document.getElementById('customNotes') ? document.getElementById('customNotes').value : '';
            order.pakket = 'custom';
        } else {
            // package selected: try to fill price
            const pkgs = JSON.parse(localStorage.getItem('ggd_packages') || 'null');
            if (pkgs && pkgs.length) {
                const sel = order.pakket;
                const found = pkgs.find(p => p.id === sel || p.name === sel);
                if (found) order.price = found.total_price || (found.price_per_hour ? found.price_per_hour * (found.hours||1) : 0);
            }
        }

        createOrder(order);
        form.reset();
        // reset UI state
        toggleOrderTypeUI();
        // refresh estimate and UI
        updateCustomEstimateDisplay();
    });
}

function calculateCustomEstimate(opts) {
    let total = 0;
    opts.forEach(o => {
        switch (o.key) {
            case 'gras': total += (o.qty * RATES.gras_per_m2); break;
            case 'heg': total += (o.qty * RATES.heg_per_m); break;
            case 'onkruid': total += (o.qty * RATES.onkruid_per_m2); break;
            case 'snoei': total += (o.qty * RATES.snoei_per_hour); break;
            case 'afvoer': total += (o.qty * RATES.afvoer_per_m3); break;
        }
    });
    return Math.round(total);
}

/* --- Form validation helpers --- */
function showFieldError(inputEl, message) {
    if (!inputEl) return;
    const container = inputEl.closest('.field') || inputEl.parentElement;
    if (!container) return;
    const err = container.querySelector('.input-error');
    if (err) err.textContent = message || '';
    inputEl.classList.add('input-invalid');
}

function clearFieldError(inputEl) {
    if (!inputEl) return;
    const container = inputEl.closest('.field') || inputEl.parentElement;
    if (!container) return;
    const err = container.querySelector('.input-error');
    if (err) err.textContent = '';
    inputEl.classList.remove('input-invalid');
}

function validateOrderForm() {
    let valid = true;
    // required: name and email
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    if (!name || !email) return false;
    if (!name.value.trim()) { showFieldError(name, 'Vul uw naam in'); valid = false; }
    else clearFieldError(name);
    if (!email.value.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) { showFieldError(email, 'Vul een geldig e-mailadres in'); valid = false; }
    else clearFieldError(email);

    // if custom: at least one checked option with qty > 0
    const type = document.querySelector('input[name="orderType"]:checked')?.value || 'package';
    if (type === 'custom') {
        const opts = Array.from(document.querySelectorAll('.opt')).map(cb => {
            const key = cb.getAttribute('data-key');
            const qtyInput = document.querySelector(`.opt-qty[data-key="${key}"]`);
            const qty = qtyInput ? Number(qtyInput.value) : 0;
            return { cb, qty };
        });
        const any = opts.some(o => o.cb.checked && o.qty > 0);
        if (!any) {
            const firstQty = document.querySelector('.opt-qty');
            if (firstQty) showFieldError(firstQty, 'Kies minimaal één werkzaamheden en vul een hoeveelheid in');
            valid = false;
        }
    }

    return valid;
}

function toggleOrderTypeUI() {
    const type = document.querySelector('input[name="orderType"]:checked')?.value || 'package';
    const custom = document.getElementById('customOptions');
    const pkg = document.getElementById('packageBlock');
    if (custom && pkg) {
        if (type === 'custom') { custom.style.display = 'block'; pkg.style.display = 'none'; }
        else { custom.style.display = 'none'; pkg.style.display = 'block'; }
    }
}

function setupCustomUI() {
    // radio toggles
    document.querySelectorAll('input[name="orderType"]').forEach(r => r.addEventListener('change', () => toggleOrderTypeUI()));
    // checkboxes show/hide qty input
    document.querySelectorAll('.opt').forEach(cb => cb.addEventListener('change', (e) => {
        const key = e.target.getAttribute('data-key');
        const qty = document.querySelector(`.opt-qty[data-key="${key}"]`);
        if (qty) qty.style.display = e.target.checked ? 'inline-block' : 'none';
        updateCustomEstimateDisplay();
    }));
    document.querySelectorAll('.opt-qty').forEach(inp => inp.addEventListener('input', updateCustomEstimateDisplay));
}

function updateCustomEstimateDisplay() {
    const opts = Array.from(document.querySelectorAll('.opt')).map(cb => {
        const key = cb.getAttribute('data-key');
        const qtyInput = document.querySelector(`.opt-qty[data-key="${key}"]`);
        const qty = qtyInput ? Number(qtyInput.value) : 0;
        return { key, checked: cb.checked, qty };
    }).filter(x => x.checked && x.qty > 0);
    const est = calculateCustomEstimate(opts);
    const el = document.getElementById('customEstimate');
    if (el) el.textContent = `€${est}`;
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavToggle();
    highlightActiveLink();
    loadPackages();
    setupForm();
    // small delay to ensure the packages are loaded and DOM elements exist
    setTimeout(() => {
        toggleOrderTypeUI();
        setupCustomUI();
        updateCustomEstimateDisplay();
    }, 200);
});