import { EmailClient } from '@azure/communication-email';

const COMM_CONNECTION_STRING = process.env.AZURE_COMM_CONNECTION_STRING || '';
const SENDER_ADDRESS = process.env.ACS_SENDER_ADDRESS || '';

export interface AlertPayload {
  caregiverName: string;
  caregiverEmail: string;
  patientUserId: string;
  medicationName: string;
  dosage: string;
  missedCount: number;
  alertReason: string;
  scheduledTime?: string;
}

export async function sendMissedDoseAlert(payload: AlertPayload): Promise<boolean> {
  if (!COMM_CONNECTION_STRING || !SENDER_ADDRESS) {
    console.warn('[Email] AZURE_COMM_CONNECTION_STRING or ACS_SENDER_ADDRESS not set — skipping email');
    return false;
  }

  const client = new EmailClient(COMM_CONNECTION_STRING);

  const subject = `⚠️ Aegis Health Alert: Missed Medication — ${payload.medicationName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .header { background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .greeting { color: #e2e8f0; font-size: 16px; margin-bottom: 20px; }
    .alert-box { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .alert-box p { color: #fca5a5; margin: 0; font-size: 14px; line-height: 1.6; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .details-table td { padding: 10px 14px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .details-table td:first-child { color: #94a3b8; width: 40%; }
    .details-table td:last-child { color: #e2e8f0; font-weight: 600; }
    .missed-count { color: #ef4444; font-size: 28px; font-weight: 900; text-align: center; margin: 0 0 6px; }
    .missed-label { color: #94a3b8; font-size: 12px; text-align: center; text-transform: uppercase; letter-spacing: 0.08em; }
    .footer { background: rgba(0,0,0,0.2); padding: 20px 40px; text-align: center; }
    .footer p { color: #475569; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>⚕️ Aegis Health — Medication Alert</h1>
      <p>Caregiver Notification System</p>
    </div>
    <div class="body">
      <p class="greeting">Hello <strong>${payload.caregiverName}</strong>,</p>
      <div class="alert-box">
        <p>Your patient has <strong>missed their scheduled medication</strong>. Please check in with them as soon as possible.</p>
      </div>
      <p class="missed-count">${payload.missedCount}</p>
      <p class="missed-label">Missed Doses Today</p>
      <br/>
      <table class="details-table">
        <tr><td>Medication</td><td>${payload.medicationName}</td></tr>
        <tr><td>Dosage</td><td>${payload.dosage}</td></tr>
        ${payload.scheduledTime ? `<tr><td>Scheduled At</td><td>${payload.scheduledTime}</td></tr>` : ''}
        <tr><td>Missed Count</td><td>${payload.missedCount} dose(s)</td></tr>
        <tr><td>Alert Reason</td><td>${payload.alertReason}</td></tr>
        <tr><td>Alert Time</td><td>${new Date().toLocaleString()}</td></tr>
      </table>
    </div>
    <div class="footer">
      <p>Automated alert from Aegis Multi-Agent Health Platform. Do not reply.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Aegis Health — Missed Medication Alert\n\nHello ${payload.caregiverName},\n\nMedication: ${payload.medicationName}\nDosage: ${payload.dosage}\n${payload.scheduledTime ? `Scheduled At: ${payload.scheduledTime}\n` : ''}Missed: ${payload.missedCount} dose(s)\nReason: ${payload.alertReason}\nTime: ${new Date().toLocaleString()}\n\nPlease contact your patient immediately.`;

  try {
    const poller = await client.beginSend({
      senderAddress: SENDER_ADDRESS,
      recipients: { to: [{ address: payload.caregiverEmail, displayName: payload.caregiverName }] },
      content: { subject, plainText: text, html },
    });
    const result = await poller.pollUntilDone();
    console.log(`[Email] ✅ Alert sent to ${payload.caregiverEmail} — status: ${result.status}`);
    return true;
  } catch (err) {
    console.error(`[Email] ❌ Failed to send alert to ${payload.caregiverEmail}:`, err);
    return false;
  }
}
