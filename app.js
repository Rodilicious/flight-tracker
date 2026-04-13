// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// Tab navigation
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Flight tracker - localStorage persistence
const STORAGE_KEY = 'flightTracker_flights';

function loadFlights() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveFlights(flights) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function renderFlights(filter = 'all') {
    const flights = loadFlights();
    const list = document.getElementById('flight-list');
    const summary = document.getElementById('points-summary');

    let filtered = flights;
    if (filter === 'outbound') filtered = flights.filter(f => f.direction.includes('Outbound'));
    else if (filter === 'return') filtered = flights.filter(f => f.direction.includes('Return'));
    else if (filter === 'starred') filtered = flights.filter(f => f.starred);

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="icon">&#9992;</div>
                <p>No flights logged yet. Search the airline sites and log what you find!</p>
            </div>`;
        summary.style.display = 'none';
        return;
    }

    // Sort by date, then starred first
    filtered.sort((a, b) => {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return new Date(a.date) - new Date(b.date);
    });

    list.innerHTML = filtered.map(f => `
        <div class="flight-entry ${f.starred ? 'starred' : ''}" data-id="${f.id}">
            <div class="flight-info">
                <h4>${f.airline} &middot; ${f.class} &middot; ${f.direction}</h4>
                <div class="flight-meta">
                    <span>${f.route}</span>
                    <span>${formatDate(f.date)}</span>
                    <span class="miles-cost">${Number(f.miles).toLocaleString()} mi</span>
                    <span>via ${f.program}</span>
                    ${f.taxes ? `<span>Tax: ${f.taxes}</span>` : ''}
                    ${f.seats ? `<span>${f.seats} seat${f.seats > 1 ? 's' : ''}</span>` : ''}
                </div>
                ${f.notes ? `<div class="flight-notes">${f.notes}</div>` : ''}
            </div>
            <div class="flight-actions">
                <button class="star-btn ${f.starred ? 'active' : ''}" onclick="toggleStar('${f.id}')" title="Star">&#9733;</button>
                <button class="delete-btn" onclick="deleteFlight('${f.id}')" title="Delete">&#10005;</button>
            </div>
        </div>
    `).join('');

    // Points summary
    const starred = flights.filter(f => f.starred);
    if (starred.length > 0) {
        const totalMiles = starred.reduce((sum, f) => sum + (Number(f.miles) * 2), 0); // x2 for 2 pax
        const budget = 1000000;
        const remaining = budget - totalMiles;
        const isAffordable = remaining >= 0;

        summary.style.display = 'block';
        summary.innerHTML = `
            <h4>Starred Flights Summary (2 passengers)</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="label">Starred Flights</div>
                    <div class="val">${starred.length}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Total Miles Needed (2 pax)</div>
                    <div class="val">${totalMiles.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Amex MR Budget</div>
                    <div class="val">${budget.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Remaining After Transfer</div>
                    <div class="val ${isAffordable ? 'affordable' : 'expensive'}">${remaining.toLocaleString()}</div>
                </div>
            </div>
            <p style="font-size:0.8rem; color:var(--text-light); margin-top:0.75rem;">
                * Miles calculated as: per-person miles x 2 passengers. Star your preferred outbound + return flights to see total cost.
            </p>
        `;
    } else {
        summary.style.display = 'none';
    }
}

// Save a flight
document.getElementById('save-flight').addEventListener('click', () => {
    const airline = document.getElementById('t-airline').value;
    const route = document.getElementById('t-route').value;
    const date = document.getElementById('t-date').value;
    const flightClass = document.getElementById('t-class').value;
    const program = document.getElementById('t-program').value;
    const miles = document.getElementById('t-miles').value;
    const taxes = document.getElementById('t-taxes').value;
    const seats = document.getElementById('t-seats').value;
    const direction = document.getElementById('t-direction').value;
    const notes = document.getElementById('t-notes').value;

    if (!airline || !route || !date || !program || !miles) {
        alert('Please fill in at least: Airline, Route, Date, Program, and Miles.');
        return;
    }

    const flights = loadFlights();
    flights.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        airline, route, date, class: flightClass, program, miles,
        taxes, seats, direction, notes, starred: false,
        addedAt: new Date().toISOString()
    });
    saveFlights(flights);
    renderFlights(getCurrentFilter());

    // Reset form fields that change per entry
    document.getElementById('t-route').value = '';
    document.getElementById('t-miles').value = '';
    document.getElementById('t-taxes').value = '';
    document.getElementById('t-seats').value = '';
    document.getElementById('t-notes').value = '';
});

function toggleStar(id) {
    const flights = loadFlights();
    const flight = flights.find(f => f.id === id);
    if (flight) {
        flight.starred = !flight.starred;
        saveFlights(flights);
        renderFlights(getCurrentFilter());
    }
}

function deleteFlight(id) {
    if (!confirm('Remove this flight?')) return;
    const flights = loadFlights().filter(f => f.id !== id);
    saveFlights(flights);
    renderFlights(getCurrentFilter());
}

function getCurrentFilter() {
    const active = document.querySelector('.filter-btn.active');
    return active ? active.dataset.filter : 'all';
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderFlights(btn.dataset.filter);
    });
});

// Initial render
renderFlights();
