const express = require('express');
const http = require('node:http');
const cors = require('cors');
const { Server } = require('socket.io');
const { initDatabase, db } = require('./database');
const { recalculateAllSocieties } = require('./services/activityEngine');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO for resilient realtime communication
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize SQLite database and tables
initDatabase();

// Routes
const authRoutes = require('./routes/auth');
const societiesRoutes = require('./routes/societies');
const noticesRoutes = require('./routes/notices');
const meetsRoutes = require('./routes/meets');
const activityRoutes = require('./routes/activity');
const paymentsRoutes = require('./routes/payments');
const chatRoutes = require('./routes/chat')(io);
const examsRoutes = require('./routes/exams');

app.use('/api/auth', authRoutes);
app.use('/api/societies', societiesRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/meets', meetsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/exams', examsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Campus Connect Backend',
    timestamp: new Date().toISOString(),
    database: 'SQLite (Node.js Native)',
    realtime: 'Socket.IO Active'
  });
});

// Realtime WebSocket Gateway
io.on('connection', (socket) => {
  // Join a society's chat and notice room
  socket.on('join_society', (societyId) => {
    socket.join(`society_${societyId}`);
  });

  socket.on('leave_society', (societyId) => {
    socket.leave(`society_${societyId}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Periodic background recalculation for activity scores & decaying weights
setInterval(() => {
  try {
    recalculateAllSocieties(db);
  } catch (err) {
    console.error('Error during periodic activity recalculation:', err);
  }
}, 5 * 60 * 1000); // every 5 minutes

// Run initial activity score computation
try {
  recalculateAllSocieties(db);
} catch (e) {}

server.listen(PORT, () => {
  console.log(`🚀 Campus Connect Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket gateway ready`);
});

module.exports = { app, server };
