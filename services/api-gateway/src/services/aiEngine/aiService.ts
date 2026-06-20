import { GoogleGenerativeAI } from '@google/generative-ai';
import { MedicalRecordModel, AppointmentModel, MedicationModel, CaregiverModel, SystemStatusModel } from '../../models/models';

// Initialize the Google Generative AI SDK if the API key is present
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_PLACEHOLDER') {
    console.warn('AI Engine Warning: GEMINI_API_KEY not configured. Falling back to Rule-Based Local AI engine.');
    return null;
  }
  try {
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Failed to initialize Google Gen AI Client:', error);
    return null;
  }
};

/**
 * Compiles patient context from MongoDB to inject into the AI agent prompt.
 */
async function compilePatientContext(userId: string): Promise<string> {
  try {
    const [history, appointments, medications, caregiver, systemStatus] = await Promise.all([
      MedicalRecordModel.find({ userId }).limit(5),
      AppointmentModel.find({ userId, status: 'Scheduled' }).limit(3),
      MedicationModel.find({ userId }),
      CaregiverModel.findOne({ userId }),
      SystemStatusModel.findOne({ userId }),
    ]);

    let context = 'PATIENT REAL-TIME HEALTH CONTEXT:\n\n';

    // 1. Caregiver Status
    context += `Caregiver Contact:\n`;
    if (caregiver) {
      context += `- Name: ${caregiver.name} (${caregiver.relationship})\n`;
      context += `- Contact: Phone: ${caregiver.phone}, Email: ${caregiver.email}\n`;
      context += `- Alert Threshold: ${caregiver.alertThreshold} consecutive missed medications.\n`;
    } else {
      context += `- No caregiver configured.\n`;
    }
    context += `- Caregiver Alert Status: ${systemStatus?.caregiverAlerted ? '⚠️ CRITICAL - CAREGIVER HAS BEEN ALERTED' : 'Normal (No alerts active)'}\n`;
    if (systemStatus?.caregiverAlerted && systemStatus.alertReason) {
      context += `  Reason for Alert: ${systemStatus.alertReason}\n`;
    }
    context += '\n';

    // 2. Medical History
    context += `Recent Medical History logs:\n`;
    if (history.length > 0) {
      history.forEach((record) => {
        context += `- [${record.date}] (${record.category}) ${record.title}: ${record.description}${record.notes ? ` (Notes: ${record.notes})` : ''}\n`;
      });
    } else {
      context += `- No history records logged.\n`;
    }
    context += '\n';

    // 3. Medications
    context += `Medications Schedule & Adherence:\n`;
    if (medications.length > 0) {
      medications.forEach((med) => {
        const schedulesStr = med.schedules
          .map((s) => `${s.time} (${s.taken ? 'Taken' : 'Not Taken / Pending'})`)
          .join(', ');
        context += `- ${med.name} (${med.dosage}, ${med.frequency}): Scheduled at [${schedulesStr}]. Current consecutive missed doses: ${med.missedCount}. Start: ${med.startDate}.\n`;
      });
    } else {
      context += `- No medications configured.\n`;
    }
    context += '\n';

    // 4. Upcoming Appointments
    context += `Upcoming Scheduled Appointments:\n`;
    if (appointments.length > 0) {
      appointments.forEach((appt) => {
        context += `- [${appt.dateTime}] Dr. ${appt.provider} (${appt.specialty}) for ${appt.purpose}.\n`;
      });
    } else {
      context += `- No upcoming scheduled appointments.\n`;
    }

    return context;
  } catch (error) {
    console.error('Error compiling patient context for AI:', error);
    return 'Error loading patient context.';
  }
}

/**
 * Generates an response from the AI Health Agent.
 */
export async function getAIHealthResponse(userMessage: string, userId: string): Promise<string> {
  const patientContext = await compilePatientContext(userId);
  const gemini = getGeminiClient();

  const systemInstruction = `
You are "Aegis", a compassionate, professional, and highly capable enterprise-grade AI Health Agent.
Your role is to help patients manage their health records, review their medication schedules, suggest appointments, and maintain adherence.
You have access to the patient's real-time medical context (history, medications, upcoming appointments, and caregiver contact configurations).

RULES:
1. ALWAYS review the provided real-time context to answer inquiries accurately. If the patient asks about their medications, check the medication list.
2. If there are missed routines (e.g. consecutive missed doses), gently remind the patient of the importance of adherence, explain if caregiver alerting is active, and offer actionable advice.
3. Be professional and empathetic. Emphasize that you are an AI assistant and they should consult a physician for urgent medical emergencies.
4. Keep answers clean, conversational, and direct. Use Markdown styling for lists and bold headers.
5. If the user mentions scheduling an appointment or logging a medical record, explain that they can do this directly using the dashboard panel inputs, and summarize what details they should enter.
6. If the caregiver has been alerted (caregiverAlerted is true), acknowledge it if relevant, explaining that you have contacted their caregiver to ensure their safety.
`;

  if (gemini) {
    const modelNames = ['gemini-pro', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'];
    for (const modelName of modelNames) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const prompt = `${systemInstruction}\n\n${patientContext}\n\nUser Question: "${userMessage}"\n\nAI Response:`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) return text;
      } catch (err: any) {
        console.warn(`Gemini model "${modelName}" failed, trying next...`, err?.message?.slice(0, 80));
      }
    }
    console.error('All Gemini models failed, using rule-based fallback.');
    return getRuleBasedFallbackResponse(userMessage, patientContext);
  } else {
    return getRuleBasedFallbackResponse(userMessage, patientContext);
  }
}

/**
 * Rule-Based Mock Engine fallback to ensure local execution runs without an API key.
 */
function getRuleBasedFallbackResponse(message: string, context: string): string {
  const lowerMessage = message.toLowerCase();

  let intro = `*(Local Rule-Based AI Engine Active)*\n\n`;

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return intro + `Hello! I am Aegis, your AI Health Agent. I can help you track your medical history, schedule appointments, and review your medication schedules. How can I assist you today?`;
  }

  if (lowerMessage.includes('medication') || lowerMessage.includes('pill') || lowerMessage.includes('medicine') || lowerMessage.includes('dose')) {
    // Extract medication summary from context
    const medsMatch = context.match(/Medications Schedule & Adherence:([\s\S]*?)Upcoming Scheduled Appointments:/);
    const medsList = medsMatch ? medsMatch[1].trim() : 'No medication list found.';
    
    return intro + `Here is your current medication status according to my records:\n\n${medsList}\n\nMake sure to mark your doses as "Taken" in the Medication Schedule panel as soon as you take them. If you miss too many doses, I will notify your caregiver to ensure your safety.`;
  }

  if (lowerMessage.includes('appointment') || lowerMessage.includes('doctor') || lowerMessage.includes('schedule')) {
    const apptsMatch = context.match(/Upcoming Scheduled Appointments:([\s\S]*?)$/);
    const apptsList = apptsMatch ? apptsMatch[1].trim() : 'No upcoming appointments.';

    return intro + `Here are your upcoming appointments:\n\n${apptsList}\n\nIf you want to schedule a new appointment, please fill out the **Schedule New Appointment** form on your dashboard.`;
  }

  if (lowerMessage.includes('history') || lowerMessage.includes('record') || lowerMessage.includes('medical')) {
    const historyMatch = context.match(/Recent Medical History logs:([\s\S]*?)Medications Schedule & Adherence:/);
    const historyList = historyMatch ? historyMatch[1].trim() : 'No medical history found.';

    return intro + `Here is a summary of your logged medical history:\n\n${historyList}\n\nTo add a new record (like an allergy, diagnosis, or lab report), use the **Log Medical History** form.`;
  }

  if (lowerMessage.includes('caregiver') || lowerMessage.includes('alert') || lowerMessage.includes('missed')) {
    const caregiverMatch = context.match(/Caregiver Contact:([\s\S]*?)Recent Medical History logs:/);
    const caregiverList = caregiverMatch ? caregiverMatch[1].trim() : '';
    
    return intro + `Regarding your caregiver alert status:\n\n${caregiverList}\n\nIf you miss medications and exceed your configured threshold, the system notification worker automatically alerts your caregiver.`;
  }

  return intro + `I received your message: "${message}". I am monitoring your records, upcoming appointments, and medication routines. If you have questions about specific medications or appointments, feel free to ask! (For clinical medical advice, please consult your physician).`;
}
