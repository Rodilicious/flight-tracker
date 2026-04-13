// Cloudflare Worker - CORS proxy for Seats.aero API
// Deploy: npx wrangler deploy
//
// Setup instructions:
// 1. npm install -g wrangler
// 2. wrangler login
// 3. cd worker && npx wrangler deploy

const API_BASE = 'https://seats.aero/partnerapi';
const ALLOWED_ORIGINS = [
    'https://rodilicious.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

export default {
    async fetch(request) {
        const origin = request.headers.get('Origin') || '';
        const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': corsOrigin,
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Partner-Authorization, Content-Type',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        const url = new URL(request.url);
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
            responseHeaders.set('Access-Control-Allow-Origin', corsOrigin);

            return new Response(apiResponse.body, {
                status: apiResponse.status,
                headers: responseHeaders,
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 502,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': corsOrigin,
                }
            });
        }
    }
};
