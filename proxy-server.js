
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Puter environment usually has this or node >= 18
const bodyParser = require('body-parser');

const app = express();
const PORT = 8000;

// Enable CORS for all origins
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.text());

console.log('------------------------------------------------');
console.log('  AlphaFlow High-Speed Relay Node');
console.log('  Mode: CORS Proxy');
console.log('------------------------------------------------');

// Health Check
app.get('/', (req, res) => {
    res.send('AlphaFlow Proxy is Active. 🟢');
});

// The Core Proxy Handler
app.use('/proxy', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        
        if (!targetUrl) {
            return res.status(400).json({ error: 'Missing "url" query parameter' });
        }

        console.log(`[PROXY] ${req.method} -> ${targetUrl}`);

        // Extract headers to forward
        // We specifically need X-MBX-APIKEY for Binance
        const headers = {};
        if (req.headers['x-mbx-apikey']) {
            headers['X-MBX-APIKEY'] = req.headers['x-mbx-apikey'];
        }
        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }

        // Prepare Fetch Options
        const options = {
            method: req.method,
            headers: headers,
        };

        // Forward body for POST/PUT/DELETE
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            if (typeof req.body === 'object') {
                options.body = JSON.stringify(req.body);
            } else {
                options.body = req.body;
            }
        }

        // Execute Request from Server Side (Bypasses Browser CORS)
        const response = await fetch(targetUrl, options);
        
        // Forward Response Status
        res.status(response.status);

        // Forward Response Body
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            res.json(data);
        } else {
            const text = await response.text();
            res.send(text);
        }

    } catch (e) {
        console.error(`[PROXY ERROR]`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n> Proxy Server running on port ${PORT}`);
});
