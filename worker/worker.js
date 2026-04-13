// Cloudflare Worker - CORS proxy for Seats.aero API + KV cloud storage

const API_BASE = 'https://seats.aero/partnerapi';
const ALLOWED_ORIGINS = [
    'https://rodilicious.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

function corsHeaders(origin) {
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Partner-Authorization, Content-Type, X-Sync-Key',
        'Access-Control-Max-Age': '86400',
    };
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const cors = corsHeaders(origin);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        const url = new URL(request.url);

        // ── Cloud data storage endpoints ──
        if (url.pathname.startsWith('/data/')) {
            return handleDataRequest(request, env, url, cors);
        }

        // ── Seats.aero API proxy ──
        if (url.pathname.startsWith('/api/')) {
            return handleApiProxy(request, url, cors);
        }

        return new Response('Not found', { status: 404, headers: cors });
    }
};

// ── Data storage via KV ──
// Keys are namespaced by a sync key (derived from user's API key)
// Endpoints:
//   GET  /data/:collection - read a collection (profile, flights, programs, settings)
//   PUT  /data/:collection - write a collection
async function handleDataRequest(request, env, url, cors) {
    const syncKey = request.headers.get('X-Sync-Key');
    if (!syncKey) {
        return jsonResponse({ error: 'X-Sync-Key header required' }, 401, cors);
    }

    // Simple hash of sync key to namespace data
    const namespace = await hashKey(syncKey);
    const collection = url.pathname.replace('/data/', '').replace(/\//g, '');
    const validCollections = ['profile', 'flights', 'programs', 'settings'];

    if (!validCollections.includes(collection)) {
        return jsonResponse({ error: 'Invalid collection' }, 400, cors);
    }

    const kvKey = `${namespace}:${collection}`;

    if (request.method === 'GET') {
        const data = await env.FLIGHT_DATA.get(kvKey);
        return jsonResponse({ data: data ? JSON.parse(data) : null }, 200, cors);
    }

    if (request.method === 'PUT') {
        const body = await request.json();
        await env.FLIGHT_DATA.put(kvKey, JSON.stringify(body.data));
        return jsonResponse({ ok: true }, 200, cors);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405, cors);
}

async function hashKey(key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const arr = Array.from(new Uint8Array(hash));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function jsonResponse(data, status, cors) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors }
    });
}

// ── Seats.aero API proxy ──
async function handleApiProxy(request, url, cors) {
    const apiPath = url.pathname.replace(/^\/api/, '');
    const targetUrl = `${API_BASE}${apiPath}${url.search}`;

    const headers = new Headers();
    const authHeader = request.headers.get('Partner-Authorization');
    if (authHeader) {
        headers.set('Partner-Authorization', authHeader);
    }

    try {
        const apiResponse = await fetch(targetUrl, {
            method: request.method,
            headers,
        });

        const responseHeaders = new Headers(apiResponse.headers);
        for (const [k, v] of Object.entries(cors)) {
            responseHeaders.set(k, v);
        }

        return new Response(apiResponse.body, {
            status: apiResponse.status,
            headers: responseHeaders,
        });
    } catch (err) {
        return jsonResponse({ error: err.message }, 502, cors);
    }
}
