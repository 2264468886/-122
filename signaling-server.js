
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Map to store clients by Room ID
// Structure: { roomId: Set<WebSocket> }
const rooms = new Map();

console.log('------------------------------------------------');
console.log('  WebRTC Signaling Server running on port 8080');
console.log('  Mode: P2P Discovery');
console.log('------------------------------------------------');

wss.on('connection', (ws) => {
  let currentRoom = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type, roomId, payload } = data;

      if (type === 'join') {
        // Handle User Joining a Room
        currentRoom = roomId;
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        
        const roomClients = rooms.get(roomId);
        if (roomClients.size >= 2) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
          return;
        }

        roomClients.add(ws);
        console.log(`[Join] Client joined room: ${roomId}. Total: ${roomClients.size}`);
        
        // If we have 2 peers, notify them to start connection
        if (roomClients.size === 2) {
          const clients = Array.from(roomClients);
          // Tell the newly joined client (or the other one) to be the initiator (Caller)
          // Here we just broadcast 'ready' and let the Client side logic decide who initiates (usually the "Client" role initiates to "Host")
          // But for symmetry, we can just say "someone start".
          // Better: The UI defines roles. We just pass messages.
          roomClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'peer-joined' }));
            }
          });
        }
      } else {
        // Forward Signaling Data (Offer, Answer, ICE Candidate)
        // Broadcast to the OTHER client in the room
        if (currentRoom && rooms.has(currentRoom)) {
          const roomClients = rooms.get(currentRoom);
          roomClients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      }
    } catch (e) {
      console.error('Signaling error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const roomClients = rooms.get(currentRoom);
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        rooms.delete(currentRoom);
      } else {
        // Notify remaining peer
        roomClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-left' }));
          }
        });
      }
      console.log(`[Leave] Client left room: ${currentRoom}`);
    }
  });
});
