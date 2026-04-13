// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}

// ── Constants ──
const STORAGE_KEY = 'flightTracker_flights';
const API_KEY_STORAGE = 'flightTracker_apiKey';
// Use local proxy in dev, Cloudflare Worker in production (GitHub Pages)
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL ? '/api' : 'https://flight-tracker-api.rod-crowder.workers.dev/api';

const SOURCE_NAMES = {
    qantas: 'Qantas Points',
    flyingblue: 'Flying Blue',
    jetblue: 'JetBlue TrueBlue',
    delta: 'Delta SkyMiles',
    american: 'AAdvantage',
    united: 'United MileagePlus',
    aeroplan: 'Aeroplan',
    alaska: 'Alaska Mileage Plan',
    qatar: 'Qatar Avios',
    emirates: 'Emirates Skywards',
    etihad: 'Etihad Guest',
    virgin_atlantic: 'Virgin Atlantic',
    velocity: 'Velocity',
    singapore: 'KrisFlyer',
    turkish: 'Turkish Miles&Smiles',
    lifemiles: 'LifeMiles',
    finnair: 'Finnair Plus',
    eurobonus: 'SAS EuroBonus',
    lufthansa: 'Miles & More',
    copa: 'ConnectMiles',
    azul: 'TudoAzul',
    aeromexico: 'Club Premier',
    ethiopian: 'ShebaMiles',
    thai: 'Royal Orchid Plus',
    saudi: 'Alfursan',
    frontier: 'Frontier Miles',
    spirit: 'Free Spirit'
};

const AMEX_TRANSFER_PARTNERS = [
    'qantas', 'singapore', 'qatar', 'emirates', 'etihad',
    'virgin_atlantic', 'thai', 'velocity'
];

const CABIN_LABELS = { Y: 'Economy', W: 'Premium Econ', J: 'Business', F: 'First' };

// ── Tab navigation ──
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ── API Key management ──
function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || '';
}

function setApiKey(key) {
    localStorage.setItem(API_KEY_STORAGE, key);
}

function checkApiKey() {
    const key = getApiKey();
    const setup = document.getElementById('api-key-setup');
    if (!key) {
        setup.style.display = 'block';
    } else {
        setup.style.display = 'none';
    }
}

document.getElementById('save-api-key').addEventListener('click', () => {
    const input = document.getElementById('api-key-input');
    const key = input.value.trim();
    if (key) {
        setApiKey(key);
        checkApiKey();
        input.value = '';
    }
});

document.getElementById('change-api-key').addEventListener('click', () => {
    const key = prompt('Enter Seats.aero API key:', getApiKey());
    if (key !== null) {
        setApiKey(key.trim());
        checkApiKey();
    }
});

checkApiKey();

// ── Seats.aero API ──
async function apiSearch(params) {
    const key = getApiKey();
    if (!key) {
        alert('Please set your Seats.aero API key first (Strategy tab > Settings).');
        return null;
    }

    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}/search?${qs}`;

    const resp = await fetch(url, {
        headers: { 'Partner-Authorization': key }
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`API error ${resp.status}: ${text}`);
    }

    return resp.json();
}

async function apiGetTrips(availabilityId) {
    const key = getApiKey();
    const resp = await fetch(`${API_BASE}/trips/${availabilityId}`, {
        headers: { 'Partner-Authorization': key }
    });
    if (!resp.ok) return null;
    return resp.json();
}

// ── Search handler ──
let currentDirection = 'outbound';

document.getElementById('search-btn').addEventListener('click', () => {
    currentDirection = 'outbound';
    runSearch();
});

document.getElementById('search-return-btn').addEventListener('click', () => {
    currentDirection = 'return';
    runSearch();
});

document.getElementById('search-oneway-btn').addEventListener('click', () => {
    currentDirection = 'oneway';
    runSearch();
});

async function runSearch() {
    const status = document.getElementById('search-status');
    const results = document.getElementById('search-results');
    const btn = document.getElementById('search-btn');
    const returnBtn = document.getElementById('search-return-btn');
    const onewayBtn = document.getElementById('search-oneway-btn');

    let origin = document.getElementById('s-origin').value;
    let dest = document.getElementById('s-dest').value;
    const dateFrom = document.getElementById('s-date-from').value;
    const dateTo = document.getElementById('s-date-to').value;
    const cabins = document.getElementById('s-cabin').value;

    // Swap origin/dest for return flights
    if (currentDirection === 'return') {
        [origin, dest] = [dest, origin];
    }
    // One-way uses the origin/dest as entered (same as outbound direction)

    btn.disabled = true;
    returnBtn.disabled = true;
    onewayBtn.disabled = true;
    status.textContent = 'Searching...';
    status.className = 'search-status searching';
    results.innerHTML = '<div class="loading">Searching for award availability...</div>';

    try {
        const data = await apiSearch({
            origin_airport: origin,
            destination_airport: dest,
            start_date: dateFrom,
            end_date: dateTo,
            cabins: cabins,
            take: 500,
            include_filtered: true
        });

        if (!data || !data.data || data.data.length === 0) {
            status.textContent = `No results found for these dates. Try widening your date range or airports.`;
            status.className = 'search-status no-results';
            results.innerHTML = renderNoResults(origin, dest, dateFrom, dateTo);
            return;
        }

        status.textContent = `Found ${data.data.length} result${data.data.length > 1 ? 's' : ''}. ${data.hasMore ? '(More available - narrow your search)' : ''}`;
        status.className = 'search-status has-results';
        results.innerHTML = renderResults(data.data, currentDirection);

        // Attach event listeners to trip detail buttons
        results.querySelectorAll('.trip-details-btn').forEach(btn => {
            btn.addEventListener('click', () => loadTripDetails(btn));
        });

        // Attach save buttons
        results.querySelectorAll('.save-result-btn').forEach(btn => {
            btn.addEventListener('click', () => saveFromResult(btn));
        });

    } catch (err) {
        status.textContent = `Error: ${err.message}`;
        status.className = 'search-status error';
        results.innerHTML = `<div class="error-message">Search failed: ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        returnBtn.disabled = false;
        onewayBtn.disabled = false;
    }
}

function renderNoResults(origin, dest, dateFrom, dateTo) {
    const origins = origin.split(',').join(', ');
    const dests = dest.split(',').join(', ');
    return `
        <div class="no-results-box">
            <h3>No award availability found</h3>
            <p>No cached results for <strong>${origins}</strong> &rarr; <strong>${dests}</strong> between ${dateFrom} and ${dateTo}.</p>
            <h4>This could mean:</h4>
            <ul>
                <li>Seats.aero hasn't scraped these dates yet (Aug 2026 may be too far out for some programs)</li>
                <li>No award seats released by airlines for these dates</li>
                <li>The specific route isn't tracked by Seats.aero</li>
            </ul>
            <h4>Try:</h4>
            <ul>
                <li>Widening the date range (e.g., entire month of August)</li>
                <li>Searching all Italian airports (Venice + Milan + Rome)</li>
                <li>Checking earlier dates that may have cached data</li>
                <li>Using the Airline Links tab to search directly on airline sites</li>
            </ul>
        </div>`;
}

function renderResults(results, direction) {
    // Group by date and sort
    const grouped = {};
    for (const r of results) {
        const raw = r.ParsedDate || r.Date || '';
        const date = raw.split('T')[0]; // normalize to YYYY-MM-DD
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(r);
    }

    const dirLabels = { outbound: 'Outbound', return: 'Return', oneway: 'One-Way' };
    const dirLabel = dirLabels[direction] || 'Outbound';
    let html = `<div class="results-header"><h3>${dirLabel} Flights</h3></div>`;

    const sortedDates = Object.keys(grouped).sort();

    for (const date of sortedDates) {
        const flights = grouped[date];
        html += `<div class="date-group"><h4>${formatDate(date)}</h4>`;

        // Sort: Business/First with lowest miles first
        flights.sort((a, b) => {
            const aMiles = getBestCabin(a);
            const bMiles = getBestCabin(b);
            return (aMiles.miles || 999999) - (bMiles.miles || 999999);
        });

        for (const f of flights) {
            html += renderResultCard(f, direction);
        }

        html += '</div>';
    }

    return html;
}

function getBestCabin(r) {
    // Prefer First, then Business
    if (r.FAvailable) return { cabin: 'F', miles: parseMiles(r.FMileageCost), seats: r.FRemainingSeats, airlines: r.FAirlines, direct: r.FDirect };
    if (r.JAvailable) return { cabin: 'J', miles: parseMiles(r.JMileageCost), seats: r.JRemainingSeats, airlines: r.JAirlines, direct: r.JDirect };
    if (r.WAvailable) return { cabin: 'W', miles: parseMiles(r.WMileageCost), seats: r.WRemainingSeats, airlines: r.WAirlines, direct: r.WDirect };
    if (r.YAvailable) return { cabin: 'Y', miles: parseMiles(r.YMileageCost), seats: r.YRemainingSeats, airlines: r.YAirlines, direct: r.YDirect };
    return { cabin: '?', miles: null, seats: 0, airlines: '', direct: false };
}

function parseMiles(str) {
    if (!str) return null;
    const n = parseFloat(str.replace(/,/g, ''));
    return isNaN(n) ? null : n;
}

function renderResultCard(r, direction) {
    const route = r.Route || {};
    const origin = route.OriginAirport || '?';
    const dest = route.DestinationAirport || '?';
    const source = r.Source || route.Source || '';
    const sourceName = SOURCE_NAMES[source] || source;
    const isAmexPartner = AMEX_TRANSFER_PARTNERS.includes(source);
    const date = r.ParsedDate || r.Date;

    // Build cabin availability rows
    let cabinRows = '';
    const cabins = [
        { key: 'F', label: 'First', avail: r.FAvailable, miles: r.FMileageCost, seats: r.FRemainingSeats, airlines: r.FAirlines, direct: r.FDirect, taxes: r.FTotalTaxes },
        { key: 'J', label: 'Business', avail: r.JAvailable, miles: r.JMileageCost, seats: r.JRemainingSeats, airlines: r.JAirlines, direct: r.JDirect, taxes: r.JTotalTaxes },
    ];

    for (const c of cabins) {
        if (!c.avail) continue;
        const miles = parseMiles(c.miles);
        const milesStr = miles ? miles.toLocaleString() : c.miles;
        const seatsStr = c.seats ? `${c.seats} seat${c.seats > 1 ? 's' : ''}` : '';
        const taxCents = c.taxes || 0;
        const taxStr = taxCents > 0 ? `$${(taxCents / 100).toFixed(0)} ${r.TaxesCurrency || ''}` : '';
        const directBadge = c.direct ? '<span class="direct-badge">Direct</span>' : '';
        const twoSeatWarning = c.seats && c.seats < 2 ? '<span class="seat-warning">Only 1 seat!</span>' : '';
        const totalFor2 = miles ? (miles * 2).toLocaleString() : '?';

        cabinRows += `
            <div class="cabin-row ${c.key === 'F' ? 'first-class' : 'business-class'}">
                <span class="cabin-label">${c.label}</span>
                <span class="cabin-miles">${milesStr} mi</span>
                <span class="cabin-total">2 pax: ${totalFor2}</span>
                <span class="cabin-meta">${seatsStr} ${directBadge} ${twoSeatWarning}</span>
                ${taxStr ? `<span class="cabin-tax">Tax: ${taxStr} pp</span>` : ''}
                ${c.airlines ? `<span class="cabin-airlines">On: ${c.airlines}</span>` : ''}
            </div>`;
    }

    if (!cabinRows) return '';

    const saveDirLabels = { outbound: 'Outbound (AU&rarr;Italy)', return: 'Return (Italy&rarr;AU)', oneway: 'One-Way' };
    const dirLabel = saveDirLabels[direction] || direction;
    const best = getBestCabin(r);
    const saveData = encodeURIComponent(JSON.stringify({
        airline: best.airlines || source,
        route: `${origin}-${dest}`,
        date: date,
        class: CABIN_LABELS[best.cabin] || best.cabin,
        program: sourceName,
        miles: best.miles,
        seats: best.seats,
        direction: dirLabel,
        taxes: r.TaxesCurrency ? `$${((best.cabin === 'F' ? r.FTotalTaxes : r.JTotalTaxes) / 100).toFixed(0)} ${r.TaxesCurrency}` : '',
        source: source
    }));

    return `
        <div class="result-card ${isAmexPartner ? 'amex-partner' : ''}">
            <div class="result-top">
                <div class="result-route">
                    <span class="result-airports">${origin} &rarr; ${dest}</span>
                    ${isAmexPartner ? '<span class="amex-badge">Amex Transfer Partner</span>' : ''}
                </div>
                <div class="result-program">${sourceName}</div>
            </div>
            ${cabinRows}
            <div class="result-actions">
                <button class="btn trip-details-btn" data-id="${r.ID}">Flight Details</button>
                <button class="btn btn-primary save-result-btn" data-flight="${saveData}">Save</button>
            </div>
            <div class="trip-details-container" id="trips-${r.ID}"></div>
        </div>`;
}

async function loadTripDetails(btn) {
    const id = btn.dataset.id;
    const container = document.getElementById(`trips-${id}`);

    if (container.innerHTML) {
        container.innerHTML = '';
        btn.textContent = 'Flight Details';
        return;
    }

    btn.textContent = 'Loading...';
    btn.disabled = true;

    try {
        const data = await apiGetTrips(id);
        if (!data || !data.data || data.data.length === 0) {
            container.innerHTML = '<p class="trip-note">No detailed flight info available.</p>';
            btn.textContent = 'Flight Details';
            btn.disabled = false;
            return;
        }

        let html = '';

        // Booking links
        if (data.booking_links && data.booking_links.length > 0) {
            html += '<div class="booking-links">';
            for (const link of data.booking_links) {
                html += `<a href="${link.link}" target="_blank" class="btn booking-link-btn">${link.label}</a>`;
            }
            html += '</div>';
        }

        for (const trip of data.data) {
            const segments = trip.AvailabilitySegments || [];
            const cabin = CABIN_LABELS[trip.Cabin] || trip.Cabin;
            const duration = trip.TotalDuration ? formatDuration(trip.TotalDuration) : '';
            const stops = trip.Stops || 0;
            const miles = trip.MileageCost ? Number(trip.MileageCost).toLocaleString() : '?';
            const connections = trip.Connections ? trip.Connections.join(', ') : '';

            html += `<div class="trip-option">
                <div class="trip-header">
                    <span class="trip-cabin">${cabin}</span>
                    <span class="trip-miles">${miles} mi</span>
                    <span class="trip-duration">${duration}</span>
                    <span class="trip-stops">${stops === 0 ? 'Nonstop' : stops + ' stop' + (stops > 1 ? 's' : '') + (connections ? ' (' + connections + ')' : '')}</span>
                    ${trip.RemainingSeats ? `<span class="trip-seats">${trip.RemainingSeats} seat${trip.RemainingSeats > 1 ? 's' : ''}</span>` : ''}
                </div>
                <div class="trip-segments">`;

            for (const seg of segments) {
                const depTime = seg.DepartsAt ? new Date(seg.DepartsAt).toLocaleString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const arrTime = seg.ArrivesAt ? new Date(seg.ArrivesAt).toLocaleString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const segDuration = seg.Duration ? formatDuration(seg.Duration) : '';

                html += `
                    <div class="segment">
                        <span class="seg-flight">${seg.FlightNumber || ''}</span>
                        <span class="seg-route">${seg.OriginAirport || ''} &rarr; ${seg.DestinationAirport || ''}</span>
                        <span class="seg-times">${depTime} &rarr; ${arrTime}</span>
                        <span class="seg-duration">${segDuration}</span>
                        <span class="seg-aircraft">${seg.AircraftName || ''}</span>
                    </div>`;
            }

            html += '</div></div>';
        }

        container.innerHTML = html;
        btn.textContent = 'Hide Details';
    } catch (err) {
        container.innerHTML = `<p class="trip-note">Error loading details: ${err.message}</p>`;
        btn.textContent = 'Flight Details';
    }

    btn.disabled = false;
}

function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}

function saveFromResult(btn) {
    const data = JSON.parse(decodeURIComponent(btn.dataset.flight));
    const flights = loadFlights();

    flights.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        airline: data.airline,
        route: data.route,
        date: data.date,
        class: data.class,
        program: data.program,
        miles: data.miles,
        taxes: data.taxes,
        seats: data.seats,
        direction: data.direction,
        notes: `Source: ${data.source}`,
        starred: false,
        addedAt: new Date().toISOString()
    });

    saveFlights(flights);
    btn.textContent = 'Saved!';
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = 'Save';
        btn.disabled = false;
    }, 2000);
}

// ── Saved flights (tracker) ──
function loadFlights() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveFlights(flights) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
}

function formatDate(dateStr) {
    // Handle both "2026-05-02" and "2026-05-02T00:00:00Z" formats
    const cleaned = dateStr ? dateStr.split('T')[0] : '';
    const d = new Date(cleaned + 'T00:00:00');
    if (isNaN(d)) return dateStr || 'Unknown date';
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function renderFlights(filter = 'all') {
    const flights = loadFlights();
    const list = document.getElementById('flight-list');
    const summary = document.getElementById('points-summary');

    let filtered = flights;
    if (filter === 'outbound') filtered = flights.filter(f => f.direction && f.direction.includes('Outbound'));
    else if (filter === 'return') filtered = flights.filter(f => f.direction && f.direction.includes('Return'));
    else if (filter === 'starred') filtered = flights.filter(f => f.starred);

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="icon">&#9992;</div>
                <p>No flights saved yet. Use Live Search to find and save award flights.</p>
            </div>`;
        summary.style.display = 'none';
        return;
    }

    filtered.sort((a, b) => {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return new Date(a.date) - new Date(b.date);
    });

    list.innerHTML = filtered.map(f => `
        <div class="flight-entry ${f.starred ? 'starred' : ''}" data-id="${f.id}">
            <div class="flight-info">
                <h4>${f.airline} &middot; ${f.class} &middot; ${f.direction || ''}</h4>
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

    // Points summary for starred
    const starred = flights.filter(f => f.starred);
    if (starred.length > 0) {
        const totalMiles = starred.reduce((sum, f) => sum + (Number(f.miles || 0) * 2), 0);
        const budget = 1000000;
        const remaining = budget - totalMiles;

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
                    <div class="label">Remaining</div>
                    <div class="val ${remaining >= 0 ? 'affordable' : 'expensive'}">${remaining.toLocaleString()}</div>
                </div>
            </div>`;
    } else {
        summary.style.display = 'none';
    }
}

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

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderFlights(btn.dataset.filter);
    });
});

// ── Profile ──
const PROFILE_KEY = 'flightTracker_profile';
const PROGRAMS_KEY = 'flightTracker_programs';

function loadProfile() {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : {};
}

function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function loadPrograms() {
    const data = localStorage.getItem(PROGRAMS_KEY);
    return data ? JSON.parse(data) : [];
}

function savePrograms(programs) {
    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
}

function initProfile() {
    const profile = loadProfile();
    if (profile.name) document.getElementById('p-name').value = profile.name;
    if (profile.email) document.getElementById('p-email').value = profile.email;
    if (profile.phone) document.getElementById('p-phone').value = profile.phone;
    if (profile.city) document.getElementById('p-city').value = profile.city;
    if (profile.points) document.getElementById('p-points').value = profile.points;
    if (profile.pax) document.getElementById('p-pax').value = profile.pax;
    if (profile.notes) document.getElementById('p-notes').value = profile.notes;

    // Load API key into profile field
    const apiKey = getApiKey();
    if (apiKey) document.getElementById('p-api-key').value = apiKey;

    renderPrograms();
}

document.getElementById('save-profile').addEventListener('click', () => {
    const profile = {
        name: document.getElementById('p-name').value,
        email: document.getElementById('p-email').value,
        phone: document.getElementById('p-phone').value,
        city: document.getElementById('p-city').value,
        points: document.getElementById('p-points').value,
        pax: document.getElementById('p-pax').value,
        notes: document.getElementById('p-notes').value
    };
    saveProfile(profile);

    // Update header points display if changed
    if (profile.points) {
        const display = document.querySelector('.points-budget .value');
        if (display) display.textContent = Number(profile.points).toLocaleString() + ' pts';
    }

    const status = document.getElementById('profile-status');
    status.textContent = 'Saved!';
    setTimeout(() => { status.textContent = ''; }, 2000);
});

document.getElementById('save-api-key-profile').addEventListener('click', () => {
    const key = document.getElementById('p-api-key').value.trim();
    if (key) {
        setApiKey(key);
        checkApiKey();
        const status = document.getElementById('api-key-profile-status');
        status.textContent = 'Saved!';
        setTimeout(() => { status.textContent = ''; }, 2000);
    }
});

// Airline programs
document.getElementById('add-program').addEventListener('click', () => {
    const program = document.getElementById('ap-program').value;
    const number = document.getElementById('ap-number').value;
    const email = document.getElementById('ap-email').value;
    const password = document.getElementById('ap-password').value;
    const balance = document.getElementById('ap-balance').value;
    const tier = document.getElementById('ap-status').value;

    if (!program) {
        alert('Please select a program.');
        return;
    }

    const programs = loadPrograms();
    programs.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        program, number, email, password, balance, tier,
        addedAt: new Date().toISOString()
    });
    savePrograms(programs);
    renderPrograms();

    // Reset form
    document.getElementById('ap-program').value = '';
    document.getElementById('ap-number').value = '';
    document.getElementById('ap-email').value = '';
    document.getElementById('ap-password').value = '';
    document.getElementById('ap-balance').value = '';
    document.getElementById('ap-status').value = '';
});

function renderPrograms() {
    const programs = loadPrograms();
    const list = document.getElementById('programs-list');

    if (programs.length === 0) {
        list.innerHTML = '<p class="note">No programs added yet.</p>';
        return;
    }

    list.innerHTML = programs.map(p => `
        <div class="program-card">
            <div class="program-info">
                <h4>${p.program}</h4>
                <div class="program-details">
                    ${p.number ? `<span><strong>Member #:</strong> ${p.number}</span>` : ''}
                    ${p.email ? `<span><strong>Login:</strong> ${p.email}</span>` : ''}
                    ${p.password ? `<span><strong>Password:</strong> <span class="password-hidden" onclick="this.textContent=this.dataset.pw; this.classList.remove('password-hidden')" data-pw="${p.password.replace(/"/g, '&quot;')}">Click to reveal</span></span>` : ''}
                    ${p.balance ? `<span><strong>Balance:</strong> ${Number(p.balance).toLocaleString()} pts</span>` : ''}
                    ${p.tier ? `<span><strong>Status:</strong> ${p.tier}</span>` : ''}
                </div>
            </div>
            <div class="program-actions">
                <button class="delete-btn" onclick="deleteProgram('${p.id}')" title="Delete">&#10005;</button>
            </div>
        </div>
    `).join('');
}

function deleteProgram(id) {
    if (!confirm('Remove this program?')) return;
    const programs = loadPrograms().filter(p => p.id !== id);
    savePrograms(programs);
    renderPrograms();
}

// Initial render
renderFlights();
initProfile();
