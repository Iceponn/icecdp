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
// This is necessary to allow your frontend, which might be served from a different origin,
// to communicate with this API.
app.use(cors());

// Parse incoming JSON request bodies.
// This middleware makes it easy to work with the data sent from the frontend.
app.use(bodyParser.json());

// Serve static files from the current directory.
// This allows us to serve the index.html file directly.
app.use(express.static('.'));

// --- In-Memory Storage & Client Management ---
// For this example, we'll store events in a simple array in memory.
// IMPORTANT: In a real production application, you should use a persistent database
// like PostgreSQL, MongoDB, or Redis to store events. In-memory data will be lost
// every time your server restarts or your Render instance goes to sleep.
let events = [];

// This array will hold the response objects of all connected clients (for SSE).
let clients = [];

// --- API Endpoints ---

/**
 * GET /events
 * This endpoint establishes a Server-Sent Events (SSE) connection.
 * It keeps the connection open and sends updates whenever a new event is added.
 */
app.get('/events', (req, res) => {
    // Set headers required for an SSE connection.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush the headers to establish the connection immediately.

    // Add this client's response object to our list of clients.
    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res, // The response object to write events to.
    };
    clients.push(newClient);
    console.log(`Client ${clientId} connected. Total clients: ${clients.length}`);

    // When the client closes the connection, remove them from our list.
    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
        console.log(`Client ${clientId} disconnected. Total clients: ${clients.length}`);
    });
});

/**
 * POST /events
 * This endpoint receives a new event from the frontend.
 * It validates the data, stores it, and then broadcasts it to all connected SSE clients.
 */
app.post('/events', (req, res) => {
    const { eventName, eventTimestamp, prop1, prop2, prop3 } = req.body;

    // Basic validation to ensure all required fields are present.
    if (!eventName || !eventTimestamp || !prop1 || !prop2 || !prop3) {
        return res.status(400).json({
            error: 'Missing required fields. Please provide eventName, eventTimestamp, prop1, prop2, and prop3.'
        });
    }

    const newEvent = {
        id: Date.now(), // Simple unique ID
        eventName,
        eventTimestamp,
        prop1,
        prop2,
        prop3,
    };

    // Store the new event.
    events.push(newEvent);
    console.log('New event received:', newEvent);

    // Send the new event to all connected clients.
    sendEventToAllClients(newEvent);

    // Respond to the POST request confirming the event was received.
    res.status(201).json(newEvent);
});

// --- Helper Function ---

/**
 * Sends a given event to all connected SSE clients.
 * @param {object} event The event object to send.
 */
function sendEventToAllClients(event) {
    console.log(`Broadcasting event to ${clients.length} client(s)...`);
    // The SSE format requires data to be prefixed with "data: " and followed by two newlines.
    const sseFormattedEvent = `data: ${JSON.stringify(event)}\n\n`;
    clients.forEach(client => client.res.write(sseFormattedEvent));
}


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Events API server is running on http://localhost:${PORT}`);
});
