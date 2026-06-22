import { ServiceBusClient, ServiceBusSender } from '@azure/service-bus';

const SB_CONN = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '';
const QUEUE_NAME = 'notifications';

let sbClient: ServiceBusClient | null = null;
let sender: ServiceBusSender | null = null;

function getSender(): ServiceBusSender | null {
  if (!SB_CONN) return null;
  if (!sbClient) sbClient = new ServiceBusClient(SB_CONN);
  if (!sender) sender = sbClient.createSender(QUEUE_NAME);
  return sender;
}

export async function publishAlert(payload: Record<string, unknown>): Promise<void> {
  const s = getSender();
  if (!s) {
    console.warn('[ServiceBus] No connection string — alert not queued');
    return;
  }
  try {
    await s.sendMessages({ body: { ...payload, type: 'missed_dose_alert' }, contentType: 'application/json' });
    console.log('[ServiceBus] Alert published to notifications queue');
  } catch (err) {
    console.error('[ServiceBus] Failed to publish alert:', err);
  }
}
