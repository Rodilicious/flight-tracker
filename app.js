// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}

// ── Constants ──
const STORAGE_KEY = 'flightTracker_flights';
const API_KEY_STORAGE = 'flightTracker_apiKey';
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const WORKER_BASE = IS_LOCAL ? '' : 'https://flight-tracker-api.rod-crowder.workers.dev';
const API_BASE = WORKER_BASE + '/api';
const DATA_BASE = WORKER_BASE + '/data';

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

// ── Airport database for autocomplete ──
const AIRPORTS = [
    // Australia
    { code: 'SYD', name: 'Sydney', country: 'Australia' },
    { code: 'MEL', name: 'Melbourne', country: 'Australia' },
    { code: 'BNE', name: 'Brisbane', country: 'Australia' },
    { code: 'PER', name: 'Perth', country: 'Australia' },
    { code: 'ADL', name: 'Adelaide', country: 'Australia' },
    { code: 'CBR', name: 'Canberra', country: 'Australia' },
    { code: 'OOL', name: 'Gold Coast', country: 'Australia' },
    { code: 'CNS', name: 'Cairns', country: 'Australia' },
    // Italy
    { code: 'VCE', name: 'Venice', country: 'Italy' },
    { code: 'MXP', name: 'Milan Malpensa', country: 'Italy' },
    { code: 'FCO', name: 'Rome Fiumicino', country: 'Italy' },
    { code: 'NAP', name: 'Naples', country: 'Italy' },
    { code: 'BLQ', name: 'Bologna', country: 'Italy' },
    { code: 'FLR', name: 'Florence', country: 'Italy' },
    { code: 'TRN', name: 'Turin', country: 'Italy' },
    { code: 'PSA', name: 'Pisa', country: 'Italy' },
    { code: 'CTA', name: 'Catania', country: 'Italy' },
    { code: 'PMO', name: 'Palermo', country: 'Italy' },
    // Major European hubs
    { code: 'LHR', name: 'London Heathrow', country: 'UK' },
    { code: 'LGW', name: 'London Gatwick', country: 'UK' },
    { code: 'CDG', name: 'Paris Charles de Gaulle', country: 'France' },
    { code: 'AMS', name: 'Amsterdam Schiphol', country: 'Netherlands' },
    { code: 'FRA', name: 'Frankfurt', country: 'Germany' },
    { code: 'MUC', name: 'Munich', country: 'Germany' },
    { code: 'ZRH', name: 'Zurich', country: 'Switzerland' },
    { code: 'VIE', name: 'Vienna', country: 'Austria' },
    { code: 'MAD', name: 'Madrid', country: 'Spain' },
    { code: 'BCN', name: 'Barcelona', country: 'Spain' },
    { code: 'IST', name: 'Istanbul', country: 'Turkey' },
    { code: 'ATH', name: 'Athens', country: 'Greece' },
    { code: 'LIS', name: 'Lisbon', country: 'Portugal' },
    { code: 'CPH', name: 'Copenhagen', country: 'Denmark' },
    { code: 'ARN', name: 'Stockholm Arlanda', country: 'Sweden' },
    { code: 'OSL', name: 'Oslo', country: 'Norway' },
    { code: 'HEL', name: 'Helsinki', country: 'Finland' },
    { code: 'DUB', name: 'Dublin', country: 'Ireland' },
    { code: 'BRU', name: 'Brussels', country: 'Belgium' },
    { code: 'WAW', name: 'Warsaw', country: 'Poland' },
    { code: 'PRG', name: 'Prague', country: 'Czech Republic' },
    { code: 'BUD', name: 'Budapest', country: 'Hungary' },
    { code: 'GVA', name: 'Geneva', country: 'Switzerland' },
    // Middle East hubs
    { code: 'DOH', name: 'Doha', country: 'Qatar' },
    { code: 'DXB', name: 'Dubai', country: 'UAE' },
    { code: 'AUH', name: 'Abu Dhabi', country: 'UAE' },
    // Asian hubs
    { code: 'SIN', name: 'Singapore', country: 'Singapore' },
    { code: 'HKG', name: 'Hong Kong', country: 'Hong Kong' },
    { code: 'NRT', name: 'Tokyo Narita', country: 'Japan' },
    { code: 'HND', name: 'Tokyo Haneda', country: 'Japan' },
    { code: 'BKK', name: 'Bangkok', country: 'Thailand' },
    { code: 'KUL', name: 'Kuala Lumpur', country: 'Malaysia' },
    { code: 'ICN', name: 'Seoul Incheon', country: 'South Korea' },
    { code: 'TPE', name: 'Taipei', country: 'Taiwan' },
    { code: 'DEL', name: 'Delhi', country: 'India' },
    { code: 'BOM', name: 'Mumbai', country: 'India' },
    // Americas
    { code: 'LAX', name: 'Los Angeles', country: 'USA' },
    { code: 'JFK', name: 'New York JFK', country: 'USA' },
    { code: 'SFO', name: 'San Francisco', country: 'USA' },
    { code: 'ORD', name: 'Chicago O\'Hare', country: 'USA' },
    { code: 'DFW', name: 'Dallas Fort Worth', country: 'USA' },
    { code: 'MIA', name: 'Miami', country: 'USA' },
    { code: 'IAD', name: 'Washington Dulles', country: 'USA' },
    { code: 'YVR', name: 'Vancouver', country: 'Canada' },
    { code: 'YYZ', name: 'Toronto', country: 'Canada' },
    // New Zealand
    { code: 'AKL', name: 'Auckland', country: 'New Zealand' },
    { code: 'CHC', name: 'Christchurch', country: 'New Zealand' },
    { code: 'WLG', name: 'Wellington', country: 'New Zealand' },
    // Africa
    { code: 'JNB', name: 'Johannesburg', country: 'South Africa' },
    { code: 'CPT', name: 'Cape Town', country: 'South Africa' },
    // Pacific
    { code: 'NAN', name: 'Nadi', country: 'Fiji' },
];

// ── Cloud sync ──
// All data syncs to Cloudflare KV via the worker, with localStorage as cache/fallback.
async function cloudGet(collection) {
    try {
        const syncKey = getApiKey();
        if (!syncKey) return null;
        const resp = await fetch(`${DATA_BASE}/${collection}`, {
            headers: { 'X-Sync-Key': syncKey }
        });
        if (!resp.ok) return null;
        const result = await resp.json();
        return result.data;
    } catch {
        return null;
    }
}

async function cloudPut(collection, data) {
    try {
        const syncKey = getApiKey();
        if (!syncKey) return;
        await fetch(`${DATA_BASE}/${collection}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Sync-Key': syncKey },
            body: JSON.stringify({ data })
        });
    } catch {
        // Silently fail - localStorage is the fallback
    }
}

// Sync indicator
function showSyncStatus(msg, isError) {
    let el = document.getElementById('sync-indicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sync-indicator';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'sync-indicator ' + (isError ? 'sync-error' : 'sync-ok');
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 2000);
}

// ── Tab navigation ──
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ── Airport autocomplete ──
function setupAutocomplete(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const sugBox = document.getElementById(suggestionsId);

    input.addEventListener('input', () => {
        const val = input.value;
        // Get the last token being typed (after the last comma)
        const parts = val.split(',');
        const query = parts[parts.length - 1].trim().toUpperCase();

        if (query.length < 2) {
            sugBox.innerHTML = '';
            sugBox.style.display = 'none';
            return;
        }

        const matches = AIRPORTS.filter(a =>
            a.code.includes(query) ||
            a.name.toUpperCase().includes(query) ||
            a.country.toUpperCase().includes(query)
        ).slice(0, 8);

        if (matches.length === 0) {
            sugBox.innerHTML = '';
            sugBox.style.display = 'none';
            return;
        }

        sugBox.innerHTML = matches.map(a =>
            `<div class="suggestion" data-code="${a.code}">
                <strong>${a.code}</strong> ${a.name}, ${a.country}
            </div>`
        ).join('');
        sugBox.style.display = 'block';

        sugBox.querySelectorAll('.suggestion').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const code = el.dataset.code;
                // Replace the last token with the selected code
                const parts = input.value.split(',').map(p => p.trim()).filter(Boolean);
                parts[parts.length - 1] = code;
                input.value = parts.join(',');
                sugBox.style.display = 'none';
                input.focus();
            });
        });
    });

    input.addEventListener('blur', () => {
        setTimeout(() => { sugBox.style.display = 'none'; }, 200);
    });

    input.addEventListener('focus', () => {
        // Clean up value on focus
        const val = input.value.trim();
        if (val) input.value = val;
    });
}

setupAutocomplete('s-origin', 'origin-suggestions');
setupAutocomplete('s-dest', 'dest-suggestions');

// Quick pick buttons
document.querySelectorAll('.pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        target.value = btn.dataset.value;
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
        cloudPut('settings', { apiKey: key });
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
let searchMode = 'oneway'; // 'oneway' or 'return'

document.getElementById('search-btn').addEventListener('click', () => {
    searchMode = 'oneway';
    runSearch();
});

document.getElementById('search-return-btn').addEventListener('click', () => {
    searchMode = 'return';
    runSearch();
});

async function runSearch() {
    const status = document.getElementById('search-status');
    const results = document.getElementById('search-results');
    const btn = document.getElementById('search-btn');
    const returnBtn = document.getElementById('search-return-btn');

    const origin = document.getElementById('s-origin').value.trim();
    const dest = document.getElementById('s-dest').value.trim();
    const dateFrom = document.getElementById('s-date-from').value;
    const dateTo = document.getElementById('s-date-to').value;
    const cabins = document.getElementById('s-cabin').value;

    if (!origin || !dest) {
        status.textContent = 'Please enter From and To airports.';
        status.className = 'search-status error';
        return;
    }

    btn.disabled = true;
    returnBtn.disabled = true;
    status.textContent = 'Searching...';
    status.className = 'search-status searching';
    results.innerHTML = '<div class="loading">Searching for award availability...</div>';

    try {
        if (searchMode === 'oneway') {
            // One-way: search From → To
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
                status.textContent = 'No results found. Try widening your date range or airports.';
                status.className = 'search-status no-results';
                results.innerHTML = renderNoResults(origin, dest, dateFrom, dateTo);
                return;
            }

            status.textContent = `Found ${data.data.length} result${data.data.length > 1 ? 's' : ''}.`;
            status.className = 'search-status has-results';
            results.innerHTML = renderResults(data.data, 'oneway');

        } else {
            // Return: search both From → To AND To → From
            status.textContent = 'Searching outbound and return...';
            const [outData, retData] = await Promise.all([
                apiSearch({
                    origin_airport: origin,
                    destination_airport: dest,
                    start_date: dateFrom,
                    end_date: dateTo,
                    cabins: cabins,
                    take: 250,
                    include_filtered: true
                }),
                apiSearch({
                    origin_airport: dest,
                    destination_airport: origin,
                    start_date: dateFrom,
                    end_date: dateTo,
                    cabins: cabins,
                    take: 250,
                    include_filtered: true
                })
            ]);

            const outCount = outData?.data?.length || 0;
            const retCount = retData?.data?.length || 0;
            const total = outCount + retCount;

            if (total === 0) {
                status.textContent = 'No results found in either direction. Try widening your date range or airports.';
                status.className = 'search-status no-results';
                results.innerHTML = renderNoResults(origin, dest, dateFrom, dateTo);
                return;
            }

            status.textContent = `Found ${outCount} outbound + ${retCount} return results.`;
            status.className = 'search-status has-results';

            let html = '';
            if (outCount > 0) {
                html += renderResults(outData.data, 'outbound');
            } else {
                html += '<div class="no-results-box"><h3>No outbound flights found</h3></div>';
            }
            html += '<hr style="margin:2rem 0; border:none; border-top:2px solid var(--border);">';
            if (retCount > 0) {
                html += renderResults(retData.data, 'return');
            } else {
                html += '<div class="no-results-box"><h3>No return flights found</h3></div>';
            }
            results.innerHTML = html;
        }

        // Attach event listeners
        results.querySelectorAll('.trip-details-btn').forEach(btn => {
            btn.addEventListener('click', () => loadTripDetails(btn));
        });
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

    const dirLabels = { outbound: 'Outbound Flights', return: 'Return Flights', oneway: 'Flights' };
    const dirLabel = dirLabels[direction] || 'Flights';
    let html = `<div class="results-header"><h3>${dirLabel}</h3></div>`;

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

    const saveDirLabels = { outbound: 'Outbound', return: 'Return', oneway: 'One-Way' };
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
    cloudPut('flights', flights).then(() => showSyncStatus('Synced'));
}

async function syncFlightsFromCloud() {
    const cloud = await cloudGet('flights');
    if (cloud && Array.isArray(cloud)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
        renderFlights(getCurrentFilter());
    }
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

function saveProfileLocal(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    cloudPut('profile', profile).then(() => showSyncStatus('Profile synced'));
}

function loadPrograms() {
    const data = localStorage.getItem(PROGRAMS_KEY);
    return data ? JSON.parse(data) : [];
}

function saveProgramsLocal(programs) {
    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
    cloudPut('programs', programs).then(() => showSyncStatus('Programs synced'));
}

async function syncAllFromCloud() {
    showSyncStatus('Syncing...');

    const [cloudProfile, cloudFlights, cloudPrograms, cloudSettings] = await Promise.all([
        cloudGet('profile'),
        cloudGet('flights'),
        cloudGet('programs'),
        cloudGet('settings')
    ]);

    if (cloudProfile) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(cloudProfile));
    }
    if (cloudFlights && Array.isArray(cloudFlights)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudFlights));
    }
    if (cloudPrograms && Array.isArray(cloudPrograms)) {
        localStorage.setItem(PROGRAMS_KEY, JSON.stringify(cloudPrograms));
    }
    if (cloudSettings) {
        if (cloudSettings.apiKey) setApiKey(cloudSettings.apiKey);
    }

    // Re-render everything
    renderFlights(getCurrentFilter());
    initProfile();
    checkApiKey();
    showSyncStatus('Synced from cloud');
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
    saveProfileLocal(profile);

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
        cloudPut('settings', { apiKey: key });
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
    saveProgramsLocal(programs);
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
    saveProgramsLocal(programs);
    renderPrograms();
}

// Initial render from localStorage (fast), then sync from cloud
renderFlights();
initProfile();

// Sync from cloud on load (updates localStorage + re-renders)
syncAllFromCloud();
