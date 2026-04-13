const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const API_BASE = 'https://seats.aero/partnerapi';
const DATA_FILE = path.join(__dirname, '.local-data.json');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

// Simple local file-based storage (mirrors KV in production)
function loadLocalData() {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
    catch { return {}; }
}

function saveLocalData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Data storage endpoints
    if (req.url.startsWith('/data/')) {
        const collection = req.url.replace('/data/', '').replace(/\//g, '');
        const validCollections = ['profile', 'flights', 'programs', 'settings'];

        if (!validCollections.includes(collection)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid collection' }));
            return;
        }

        if (req.method === 'GET') {
            const store = loadLocalData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: store[collection] || null }));
            return;
        }

        if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const store = loadLocalData();
                store[collection] = JSON.parse(body).data;
                saveLocalData(store);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            });
            return;
        }
    }

    // Proxy API requests
    if (req.url.startsWith('/api/')) {
        const apiPath = req.url.slice(4);
        const targetUrl = `${API_BASE}${apiPath}`;

        const headers = {};
        if (req.headers['partner-authorization']) {
            headers['Partner-Authorization'] = req.headers['partner-authorization'];
        }

        https.get(targetUrl, { headers }, (apiRes) => {
            res.writeHead(apiRes.statusCode, {
                'Content-Type': apiRes.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            apiRes.pipe(res);
        }).on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        });
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Flight Tracker running at http://localhost:${PORT}`);
});
