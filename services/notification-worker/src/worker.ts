import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { runWorkerCycle } from './services/notificationService';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-health-agent';
const CHECK_INTERVAL_MS = 20000; // Poll every 20 seconds

// ─── Entry Point ───────────────────────────────────────────────────────────────
console.log(`[Worker] Connecting to MongoDB: ${MONGODB_URI}`);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('[Worker] Connected to MongoDB. Starting notification worker...');

    // Run immediately on start, then poll
    runWorkerCycle();
    setInterval(runWorkerCycle, CHECK_INTERVAL_MS);
  })
  .catch((err) => {
    console.error('[Worker Error] Initial Database connection failed:', err);
    process.exit(1);
  });
