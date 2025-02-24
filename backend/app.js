// app.js or server.js
const express = require('express');
const cors = require('cors');
const scrapbookRoutes = require('./routes/scrapbooks');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Error logging middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost',
    'http://localhost:3000',
    'https://backend-ol2hbnwal-stepans-projects-92e05b5b.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log request bodies for POST/PUT/PATCH requests
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log('Request body:', req.body);
  }
  next();
});

app.use('/api/scrapbooks', scrapbookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});