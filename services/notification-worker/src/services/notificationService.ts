import { MedicationModel, CaregiverModel, SystemStatusModel } from '../models/models';
import { formatDate, formatTime } from '../utils/helpers';
import { sendMissedDoseAlert } from './emailService';
import { ServiceBusClient } from '@azure/service-bus';

const SB_CONN = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '';
const QUEUE_NAME = 'notifications';

export async function runWorkerCycle(): Promise<void> {
  try {
    const now = new Date();
    const currentDateStr = formatDate(now);
    const currentTimeStr = formatTime(now);

    console.log(
      `[Worker - ${now.toISOString()}] Running monitoring cycle. Time: ${currentTimeStr}, Date: ${currentDateStr}`
    );

    // ─── Get all unique userIds that have medications ─────────────────────────
    const userIds = await MedicationModel.distinct('userId');
    console.log(`[Worker] Found ${userIds.length} user(s) to process.`);

    for (const userId of userIds) {
      await processUserCycle(userId, now, currentDateStr, currentTimeStr);
    }

  } catch (error) {
    console.error('[Worker Error] Exception in monitoring cycle:', error);
  }
}

async function processUserCycle(
  userId: any,
  now: Date,
  currentDateStr: string,
  currentTimeStr: string
): Promise<void> {
  try {
    // Get or create per-user system status
    let statusDoc = await (SystemStatusModel as any).findOne({ userId }) as any;
    if (!statusDoc) {
      statusDoc = await (SystemStatusModel as any).create({ userId, caregiverAlerted: false });
    }

    // ─── 1. Daily Reset (per user) ────────────────────────────────────────────
    if (statusDoc.lastResetDate !== currentDateStr) {
      console.log(`[Worker][User:${userId}] New day detected! Resetting medication schedules.`);
      const medications = await MedicationModel.find({ userId });
      for (const med of medications) {
        med.schedules = med.schedules.map((s) => {
          s.taken = false;
          s.takenAt = undefined;
          return s;
        });
        med.missedCount = 0;
        await med.save();
      }
      statusDoc.lastResetDate = currentDateStr;
      statusDoc.caregiverAlerted = false;
      statusDoc.alertReason = undefined;
      await statusDoc.save();
      console.log(`[Worker][User:${userId}] Daily reset complete.`);
    }

    // ─── 2. Missed Dose Detection (per user) ──────────────────────────────────
    const medications = await MedicationModel.find({ userId });
    const caregiver = await CaregiverModel.findOne({ userId });
    const alertThreshold = caregiver?.alertThreshold || 2;

    for (const med of medications) {
      let updated = false;

      for (const schedule of med.schedules) {
        const isPastDue = currentTimeStr > schedule.time;
        const isNotTaken = !schedule.taken;
        const notYetProcessedToday =
          !schedule.takenAt || !schedule.takenAt.startsWith(`missed-${currentDateStr}`);

        if (isNotTaken && isPastDue && notYetProcessedToday) {
          console.log(
            `[Worker][User:${userId}] MISSED: "${med.name}" schedule "${schedule.time}" has passed.`
          );
          schedule.takenAt = `missed-${currentDateStr}`;
          med.missedCount += 1;
          med.lastUpdated = now.toISOString();
          updated = true;

          // ─── 3. Caregiver Alert ───────────────────────────────────────────────
          if (med.missedCount >= alertThreshold && !statusDoc.caregiverAlerted) {
            const reason = `Patient missed "${med.name}" (${med.dosage}) ${med.missedCount} times. Threshold: ${alertThreshold}.`;
            console.warn(`[Worker][User:${userId}] ⚠️ THRESHOLD REACHED — sending caregiver email alert.`);

            if (caregiver?.email) {
              const payload = {
                type: 'missed_dose_alert',
                caregiverName: caregiver.name,
                caregiverEmail: caregiver.email,
                patientUserId: String(userId),
                medicationName: med.name,
                dosage: med.dosage,
                missedCount: med.missedCount,
                alertThreshold,
                alertReason: reason,
              };

              // Publish to Service Bus if available, else send email directly
              if (SB_CONN) {
                const sbClient = new ServiceBusClient(SB_CONN);
                const sender = sbClient.createSender(QUEUE_NAME);
                try {
                  await sender.sendMessages({ body: payload, contentType: 'application/json' });
                  console.log(`[Worker][User:${userId}] Alert queued → Service Bus`);
                } finally {
                  await sender.close();
                  await sbClient.close();
                }
              } else {
                const emailSent = await sendMissedDoseAlert(payload);
                console.log(`[Worker][User:${userId}] Alert sent=${emailSent} → ${caregiver.name} <${caregiver.email}>`);
              }

              statusDoc.caregiverAlerted = true;
              statusDoc.alertReason = reason;
              statusDoc.lastNotificationSent = now.toISOString();
            } else {
              console.warn(`[Worker][User:${userId}] No caregiver email on file — skipping alert.`);
            }
          }
        }
      }

      if (updated) await med.save();
    }

    await statusDoc.save();

  } catch (error) {
    console.error(`[Worker Error][User:${userId}] Exception in processUserCycle:`, error);
  }
}
