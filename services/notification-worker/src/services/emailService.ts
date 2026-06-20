import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // TLS
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export interface AlertPayload {
  caregiverName: string;
  caregiverEmail: string;
  patientUserId: string;
  medicationName: string;
  dosage: string;
  missedCount: number;
  alertThreshold: number;
  alertReason: string;
}

export async function sendMissedDoseAlert(payload: AlertPayload): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[Email] SMTP credentials not set — skipping email. Set SMTP_USER and SMTP_PASS in .env');
    return false;
  }

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
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .greeting { color: #e2e8f0; font-size: 16px; margin-bottom: 20px; }
    .alert-box { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .alert-box p { color: #fca5a5; margin: 0; font-size: 14px; line-height: 1.6; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .details-table td { padding: 10px 14px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .details-table td:first-child { color: #94a3b8; width: 40%; }
    .details-table td:last-child { color: #e2e8f0; font-weight: 600; }
    .cta-section { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 20px; text-align: center; }
    .cta-section p { color: #94a3b8; font-size: 13px; margin: 0 0 14px; }
    .badge { display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #fff; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; }
    .footer { background: rgba(0,0,0,0.2); padding: 20px 40px; text-align: center; }
    .footer p { color: #475569; font-size: 12px; margin: 0; }
    .missed-count { color: #ef4444; font-size: 28px; font-weight: 900; text-align: center; margin: 0 0 6px; }
    .missed-label { color: #94a3b8; font-size: 12px; text-align: center; text-transform: uppercase; letter-spacing: 0.08em; }
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
        <p>
          Your patient has <strong>missed their scheduled medication</strong> and has reached or exceeded 
          the alert threshold you configured. Please check in with them as soon as possible.
        </p>
      </div>

      <p class="missed-count">${payload.missedCount}</p>
      <p class="missed-label">Missed Doses</p>
      <br/>

      <table class="details-table">
        <tr><td>Medication</td><td>${payload.medicationName}</td></tr>
        <tr><td>Dosage</td><td>${payload.dosage}</td></tr>
        <tr><td>Missed Count</td><td>${payload.missedCount} dose(s)</td></tr>
        <tr><td>Alert Threshold</td><td>${payload.alertThreshold} dose(s)</td></tr>
        <tr><td>Alert Reason</td><td>${payload.alertReason}</td></tr>
        <tr><td>Alert Time</td><td>${new Date().toLocaleString()}</td></tr>
      </table>

      <div class="cta-section">
        <p>Please contact your patient and verify they are okay.</p>
        <span class="badge">🔔 Action Required</span>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated alert from Aegis Multi-Agent Health Platform.<br/>
      Do not reply to this email. Contact your patient directly.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Aegis Health — Missed Medication Alert
=======================================
Hello ${payload.caregiverName},

Your patient has missed their scheduled medication and reached the alert threshold.

Medication: ${payload.medicationName}
Dosage:     ${payload.dosage}
Missed:     ${payload.missedCount} dose(s) (Threshold: ${payload.alertThreshold})
Reason:     ${payload.alertReason}
Time:       ${new Date().toLocaleString()}

Please contact your patient immediately.

— Aegis Health Notification System
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Aegis Health Alerts" <${SMTP_USER}>`,
      to: payload.caregiverEmail,
      subject,
      text,
      html,
    });
    console.log(`[Email] ✅ Alert sent to ${payload.caregiverEmail} — MessageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[Email] ❌ Failed to send alert to ${payload.caregiverEmail}:`, err);
    return false;
  }
}
