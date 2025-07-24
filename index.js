// index.js
// A simple Express server for handling real-time events with Server-Sent Events (SSE).

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
// Use the PORT environment variable provided by Render, or default to 3000 for local development.
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Enable Cross-Origin Resource Sharing (CORS) for all routes.
app.use(cors());

// Parse incoming JSON request bodies.
app.use(bodyParser.json());

// Serve static files from the current directory.
app.use(express.static('.'));

// --- In-Memory Storage & Client Management ---
// For this example, we'll store events in a simple array in memory.
// In a real production application, you should use a persistent database.
let events = [];

// This array will hold the response objects of all connected clients (for SSE).
let clients = [];

// --- API Endpoints ---

/**
 * GET /events
 * Establishes a Server-Sent Events (SSE) connection.
 */
app.get('/events', (req, res) => {
    // Set headers required for an SSE connection.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush the headers to establish the connection immediately.

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);
    console.log(`Client ${clientId} connected. Total clients: ${clients.length}`);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
        console.log(`Client ${clientId} disconnected. Total clients: ${clients.length}`);
    });
});

/**
 * POST /events
 * Receives a new event, validates it, stores it, and broadcasts it.
 */
app.post('/events', (req, res) => {
    // Destructure all expected fields, including the new imgURL
    const { eventName, eventTimestamp, prop1, prop2, prop3, imgURL } = req.body;

    // Basic validation to ensure required fields are present.
    if (!eventName || !eventTimestamp || !prop1 || !prop2 || !prop3) {
        return res.status(400).json({
            error: 'Missing required fields. Please provide eventName, eventTimestamp, prop1, prop2, and prop3.'
        });
    }

    const newEvent = {
        id: Date.now(),
        eventName,
        eventTimestamp,
        prop1,
        prop2,
        prop3,
        imgURL: imgURL || '' // Store imgURL, default to empty string if not provided
    };

    events.push(newEvent);
    console.log('New event received:', newEvent);

    // Send the new event to all connected clients.
    sendEventToAllClients(newEvent);

    res.status(201).json(newEvent);
});

// --- Helper Function ---

/**
 * Sends a given event to all connected SSE clients.
 * @param {object} event The event object to send.
 */
function sendEventToAllClients(event) {
    console.log(`Broadcasting event to ${clients.length} client(s)...`);
    const sseFormattedEvent = `data: ${JSON.stringify(event)}\n\n`;
    clients.forEach(client => client.res.write(sseFormattedEvent));
}


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Events API server is running on http://localhost:${PORT}`);
});
