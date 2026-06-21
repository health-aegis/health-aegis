const { DocumentAnalysisClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");
const mongoose = require("mongoose");
const { EmailClient } = require("@azure/communication-email");

// ─── Config ───────────────────────────────────────────────────────────────────
const FORM_RECOGNIZER_ENDPOINT = process.env.FORM_RECOGNIZER_ENDPOINT;
const FORM_RECOGNIZER_KEY = process.env.FORM_RECOGNIZER_KEY;
const MONGODB_URI = process.env.COSMOS_MONGODB_URI;
const ACS_CONNECTION_STRING = process.env.ACS_CONNECTION_STRING;
const ACS_SENDER_ADDRESS = process.env.ACS_SENDER_ADDRESS;
const APP_BASE_URL = process.env.APP_BASE_URL || "https://aegishealth.io";
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

// ─── Mongoose schemas ─────────────────────────────────────────────────────────
const MedicalRecordSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  date: String,
  category: String,
  title: String,
  description: String,
  notes: String,
  blobUrl: String,
  blobName: String,
  processingStatus: { type: String, enum: ['none', 'pending', 'processed', 'failed', 'empty'], default: 'none' },
  extractedText: String,
}, { timestamps: true, collection: 'medicalrecords' });

// User schema — matches the users collection created by the api-gateway auth module
const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
}, { timestamps: true, collection: 'users' });

let MedicalRecord = null;
let User = null;
let dbConnected = false;

async function connectDB() {
  if (dbConnected) return;
  if (!MONGODB_URI) throw new Error("COSMOS_MONGODB_URI environment variable is not set.");
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  MedicalRecord = mongoose.models.MedicalRecord || mongoose.model("MedicalRecord", MedicalRecordSchema);
  User = mongoose.models.User || mongoose.model("User", UserSchema);
  dbConnected = true;
}

// ─── Derive blob URL ──────────────────────────────────────────────────────────
function buildBlobUrl(blobPath) {
  try {
    const match = AZURE_STORAGE_CONNECTION_STRING.match(/AccountName=([^;]+)/);
    if (!match) return null;
    return `https://${match[1]}.blob.core.windows.net/health-records/${blobPath}`;
  } catch { return null; }
}

// ─── Main Function ────────────────────────────────────────────────────────────
module.exports = async function (context, myBlob) {
  const userId = context.bindingData.userId;
  const filename = context.bindingData.filename;
  const blobPath = `${userId}/${filename}`;

  context.log(`[health-record-processor] Triggered for: ${blobPath} (${myBlob.length} bytes)`);

  const blobUrl = buildBlobUrl(blobPath);
  const title = filename.replace(/^[a-f0-9\-]{36}\./, "").replace(/\.[^.]+$/, "") || filename;
  const processedAt = new Date().toISOString();

  let extractedText = "";
  let processingStatus = "failed";

  // ─── Step 1: OCR via Azure Document Intelligence ──────────────────────────
  try {
    if (!FORM_RECOGNIZER_ENDPOINT || !FORM_RECOGNIZER_KEY) {
      throw new Error("Form Recognizer credentials not configured.");
    }
    const docClient = new DocumentAnalysisClient(
      FORM_RECOGNIZER_ENDPOINT,
      new AzureKeyCredential(FORM_RECOGNIZER_KEY)
    );
    context.log("[health-record-processor] Starting OCR...");
    const poller = await docClient.beginAnalyzeDocument("prebuilt-read", myBlob);
    const result = await poller.pollUntilDone();

    if (result && result.pages) {
      const lines = [];
      for (const page of result.pages) {
        if (page.lines) {
          for (const line of page.lines) lines.push(line.content);
        }
      }
      extractedText = lines.join("\n");
    }
    processingStatus = extractedText.length > 0 ? "processed" : "empty";
    context.log(`[health-record-processor] OCR done. ${extractedText.length} chars extracted.`);
  } catch (err) {
    context.log.error("[health-record-processor] OCR failed:", err.message);
    processingStatus = "failed";
    extractedText = `OCR processing failed: ${err.message}`;
  }

  // ─── Step 2: Save / Update in Cosmos DB & look up user email ──────────────
  let userEmail = process.env.TEST_NOTIFICATION_EMAIL || "patient@example.com";
  let userName = "Patient";

  try {
    await connectDB();
    const objectIdUserId = new mongoose.Types.ObjectId(userId);

    // ── Look up user email from the users collection ────────────────────────
    try {
      const userDoc = await User.findById(objectIdUserId).select("email name");
      if (userDoc && userDoc.email) {
        userEmail = userDoc.email;
        userName = userDoc.name || "Patient";
        context.log(`[health-record-processor] Sending notification to user: ${userEmail}`);
      } else {
        context.log.warn("[health-record-processor] User not found, using fallback email.");
      }
    } catch (userErr) {
      context.log.warn("[health-record-processor] Could not fetch user email:", userErr.message);
    }

    // ── Upsert the medical record ───────────────────────────────────────────
    const existingRecord = await MedicalRecord.findOne({ blobName: blobPath, userId: objectIdUserId });
    if (existingRecord) {
      existingRecord.extractedText = extractedText;
      existingRecord.processingStatus = processingStatus;
      await existingRecord.save();
      context.log("[health-record-processor] Updated existing record in Cosmos DB.");
    } else {
      await MedicalRecord.create({
        userId: objectIdUserId,
        blobName: blobPath,
        blobUrl,
        title: `Uploaded: ${title}`,
        category: "Lab Report",
        description: "Auto-processed document uploaded by patient.",
        date: processedAt.split("T")[0],
        extractedText,
        processingStatus,
      });
      context.log("[health-record-processor] Created new record in Cosmos DB.");
    }
  } catch (err) {
    context.log.error("[health-record-processor] DB save failed:", err.message);
  }

  // ─── Step 3: Send Email via Azure Communication Services ─────────────────
  try {
    if (!ACS_CONNECTION_STRING || !ACS_SENDER_ADDRESS) {
      context.log.warn("[health-record-processor] ACS not configured. Skipping email.");
      return;
    }

    const emailClient = new EmailClient(ACS_CONNECTION_STRING);
    const statusLabel = processingStatus === "processed"
      ? "Successfully Processed"
      : "Processing Completed with Issues";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #14b8a6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Aegis Health</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">AI-Powered Health Management</p>
        </div>
        <div style="padding: 30px; background: #fff; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="color: #1e293b;">Hi ${userName}, your document is ready!</h2>
          <p style="color: #64748b;">Your health document has been processed by the Aegis AI engine.</p>
          <div style="background: #f8fafc; border-left: 4px solid #0ea5e9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #475569;"><strong>File:</strong> ${filename}</p>
            <p style="margin: 5px 0 0; color: #475569;"><strong>Status:</strong> ${statusLabel}</p>
            <p style="margin: 5px 0 0; color: #475569;"><strong>Processed:</strong> ${new Date(processedAt).toLocaleString()}</p>
          </div>
          ${processingStatus === "processed" ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.85rem; color: #166534;"><strong>Extracted Text Preview:</strong></p>
            <p style="margin: 8px 0 0; font-size: 0.8rem; color: #15803d; font-family: monospace; line-height: 1.6;">
              ${extractedText.substring(0, 300)}${extractedText.length > 300 ? "..." : ""}
            </p>
          </div>` : ""}
          ${blobUrl ? `<p><a href="${blobUrl}" style="background: #0ea5e9; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Original Document</a></p>` : ""}
          <p style="color: #64748b; margin-top: 20px; font-size: 0.9rem;">
            View the full extracted text at your
            <a href="${APP_BASE_URL}/patient/records" style="color: #0ea5e9;">Medical Records Dashboard</a>.
          </p>
        </div>
        <div style="padding: 15px; text-align: center; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 0.75rem; color: #94a3b8;">Aegis Health — AI-Powered Patient &amp; Caregiver Advisor</p>
        </div>
      </div>
    `;

    const message = {
      senderAddress: ACS_SENDER_ADDRESS,
      recipients: {
        to: [{ address: userEmail, displayName: userName }],
      },
      content: {
        subject: `Aegis Health: "${filename}" has been processed`,
        html: emailHtml,
      },
    };

    const sendPoller = await emailClient.beginSend(message);
    await sendPoller.pollUntilDone();
    context.log(`[health-record-processor] Email sent via ACS to ${userEmail}.`);
  } catch (err) {
    context.log.error("[health-record-processor] Email failed:", err.message);
  }
};
