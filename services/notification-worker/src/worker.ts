import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ServiceBusClient } from '@azure/service-bus';
import { runWorkerCycle } from './services/notificationService';
import { sendMissedDoseAlert, AlertPayload } from './services/emailService';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-health-agent';
const SB_CONN = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '';
const QUEUE_NAME = 'notifications';
const CHECK_INTERVAL_MS = 20000;

async function startServiceBusConsumer(): Promise<void> {
  if (!SB_CONN) {
    console.warn('[ServiceBus] AZURE_SERVICE_BUS_CONNECTION_STRING not set — queue consumer disabled');
    return;
  }

  const sbClient = new ServiceBusClient(SB_CONN);
  const receiver = sbClient.createReceiver(QUEUE_NAME, { receiveMode: 'peekLock' });

  receiver.subscribe({
    processMessage: async (message) => {
      try {
        const payload = message.body as AlertPayload & { type?: string };
        console.log(`[ServiceBus] Received message type=${payload.type} for ${payload.caregiverEmail}`);
        await sendMissedDoseAlert(payload);
        await receiver.completeMessage(message);
      } catch (err) {
        console.error('[ServiceBus] Failed to process message — abandoning:', err);
        await receiver.abandonMessage(message);
      }
    },
    processError: async (err) => {
      console.error('[ServiceBus] Receiver error:', err.error);
    },
  });

  console.log(`[ServiceBus] Subscribed to queue "${QUEUE_NAME}"`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[ServiceBus] Closing receiver...');
    await receiver.close();
    await sbClient.close();
    process.exit(0);
  });
}

// ─── Entry Point ───────────────────────────────────────────────────────────────
console.log(`[Worker] Connecting to MongoDB: ${MONGODB_URI}`);

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('[Worker] Connected to MongoDB. Starting notification worker...');

    // Start Service Bus consumer (non-blocking — subscribes in background)
    await startServiceBusConsumer();

    // Start MongoDB polling cycle
    runWorkerCycle();
    setInterval(runWorkerCycle, CHECK_INTERVAL_MS);
  })
  .catch((err) => {
    console.error('[Worker Error] Initial Database connection failed:', err);
    process.exit(1);
  });
