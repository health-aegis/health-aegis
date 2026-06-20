import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST, before importing any local modules that might read them
dotenv.config();

import apiRouter from './routes/index';
import { errorHandler, notFound } from './middleware/errorHandler';
import {
  MedicalRecordModel,
  AppointmentModel,
  MedicationModel,
  SystemStatusModel,
} from './models/models';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Make io accessible in routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('New WebSocket Connection:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('WebSocket Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-health-agent';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/healthz', (req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.status(500).json({
      status: 'down',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── DB Connection ────────────────────────────────────────────────────────────
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully');
    server.listen(PORT, () => {
      console.log(`API Gateway & WebSockets running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// Trigger nodemon restart

// Trigger nodemon restart after env change
