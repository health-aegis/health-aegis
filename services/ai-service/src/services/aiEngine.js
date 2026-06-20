const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  MedicalRecord, Appointment, Medication, Caregiver, SystemStatus,
} = require('../models/models');

// ─── Gemini Client ────────────────────────────────────────────────────────────
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_PLACEHOLDER') {
    console.warn('[ai-service] GEMINI_API_KEY not set. Using rule-based fallback engine.');
    return null;
  }
  try { return new GoogleGenerativeAI(apiKey); }
  catch (err) { console.error('[ai-service] Failed to init Gemini:', err); return null; }
};

// ─── Patient Context Builder ──────────────────────────────────────────────────
async function compilePatientContext(userId) {
  if (!userId) return 'Error: userId not provided — cannot load patient context.';
  try {
    const filter = { userId };
    const [history, appointments, medications, caregiver, systemStatus] = await Promise.all([
      MedicalRecord.find(filter).sort({ createdAt: -1 }).limit(5),
      Appointment.find({ ...filter, status: 'Scheduled' }).limit(3),
      Medication.find(filter),
      Caregiver.findOne(filter),
      SystemStatus.findOne(filter),
    ]);

    let ctx = 'PATIENT REAL-TIME HEALTH CONTEXT:\n\n';

    ctx += 'Caregiver Contact:\n';
    if (caregiver) {
      ctx += `- Name: ${caregiver.name} (${caregiver.relationship})\n`;
      ctx += `- Contact: Phone: ${caregiver.phone}, Email: ${caregiver.email}\n`;
      ctx += `- Alert Threshold: ${caregiver.alertThreshold} consecutive missed medications.\n`;
    } else { ctx += '- No caregiver configured.\n'; }
    ctx += `- Caregiver Alert Status: ${systemStatus?.caregiverAlerted ? '⚠️ CRITICAL - CAREGIVER HAS BEEN ALERTED' : 'Normal (No alerts active)'}\n`;
    if (systemStatus?.caregiverAlerted && systemStatus.alertReason)
      ctx += `  Reason: ${systemStatus.alertReason}\n`;
    ctx += '\n';

    ctx += 'Recent Medical History:\n';
    if (history.length > 0)
      history.forEach(r => ctx += `- [${r.date}] (${r.category}) ${r.title}: ${r.description}${r.notes ? ` (Notes: ${r.notes})` : ''}\n`);
    else ctx += '- No records logged.\n';
    ctx += '\n';

    ctx += 'Medications Schedule & Adherence:\n';
    if (medications.length > 0)
      medications.forEach(m => {
        const sched = m.schedules.map(s => `${s.time} (${s.taken ? 'Taken' : 'Pending'})`).join(', ');
        ctx += `- ${m.name} (${m.dosage}, ${m.frequency}): [${sched}]. Missed: ${m.missedCount}.\n`;
      });
    else ctx += '- No medications configured.\n';
    ctx += '\n';

    ctx += 'Upcoming Appointments:\n';
    if (appointments.length > 0)
      appointments.forEach(a => ctx += `- [${a.dateTime}] Dr. ${a.provider} (${a.specialty}) for ${a.purpose}.\n`);
    else ctx += '- No upcoming appointments.\n';

    return ctx;
  } catch (err) {
    console.error('[ai-service] Error compiling context:', err);
    return 'Error loading patient context.';
  }
}

// ─── Main AI Response ─────────────────────────────────────────────────────────
async function getAIHealthResponse(userMessage, userId) {
  const patientContext = await compilePatientContext(userId);
  const gemini = getGeminiClient();

  const systemInstruction = `
You are "Aegis", a compassionate, professional enterprise-grade AI Health Agent.
Your role is to help patients manage their health records, medication schedules, and appointments.
You have real-time access to the patient's medical context below.

RULES:
1. Always use the provided context to answer accurately.
2. If there are missed routines, gently remind the patient of adherence importance.
3. Be professional and empathetic. Emphasize you are an AI assistant — emergencies need a physician.
4. Keep answers clean and conversational. Use Markdown for lists.
5. If the caregiver alert is active, acknowledge it when relevant.
`;

  if (gemini) {
    try {
      const model  = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `${systemInstruction}\n\n${patientContext}\n\nUser: "${userMessage}"\n\nAegis:`;
      const result = await model.generateContent(prompt);
      return result.response.text() || 'I could not generate a response at this moment.';
    } catch (err) {
      console.error('[ai-service] Gemini API error, falling back:', err.message);
      return getRuleBasedResponse(userMessage, patientContext);
    }
  }
  return getRuleBasedResponse(userMessage, patientContext);
}

// ─── Rule-Based Fallback ──────────────────────────────────────────────────────
function getRuleBasedResponse(message, context) {
  const msg   = message.toLowerCase();
  const intro = '*(Local Rule-Based Engine Active)*\n\n';

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey'))
    return intro + 'Hello! I am Aegis, your AI Health Agent. Ask me about your medications, appointments, or medical history.';

  if (msg.includes('medication') || msg.includes('pill') || msg.includes('dose')) {
    const match = context.match(/Medications Schedule & Adherence:\n([\s\S]*?)(?:\n\n|$)/);
    return intro + `Your current medication status:\n\n${match ? match[1].trim() : 'No medications found.'}\n\nMark your doses as Taken in the dashboard as soon as you take them.`;
  }

  if (msg.includes('appointment') || msg.includes('doctor')) {
    const match = context.match(/Upcoming Appointments:\n([\s\S]*?)(?:\n\n|$)/);
    return intro + `Your upcoming appointments:\n\n${match ? match[1].trim() : 'No appointments scheduled.'}\n\nUse the Appointments panel to schedule new ones.`;
  }

  if (msg.includes('history') || msg.includes('record') || msg.includes('medical')) {
    const match = context.match(/Recent Medical History:\n([\s\S]*?)(?:\n\n|$)/);
    return intro + `Your medical history summary:\n\n${match ? match[1].trim() : 'No records found.'}\n\nUse the Medical History panel to log new entries.`;
  }

  if (msg.includes('caregiver') || msg.includes('alert') || msg.includes('missed')) {
    const match = context.match(/Caregiver Contact:\n([\s\S]*?)(?:\n\n|$)/);
    return intro + `Caregiver alert status:\n\n${match ? match[1].trim() : 'No caregiver configured.'}\n\nMissing medications beyond your threshold automatically alerts your caregiver.`;
  }

  return intro + `I received your message: "${message}". I am monitoring your health records, appointments, and medication routines. Feel free to ask me anything! (For urgent medical emergencies, please consult your physician.)`;
}

module.exports = { getAIHealthResponse };
