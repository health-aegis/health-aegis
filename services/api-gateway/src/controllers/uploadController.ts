import { Request, Response } from 'express';
import multer from 'multer';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { MedicalRecordModel } from '../models/models';
import { v4 as uuidv4 } from 'uuid';

// ─── Azure Blob Config ────────────────────────────────────────────────────────
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const AZURE_CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'health-records';

// ─── Multer (in-memory storage) ───────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload PDF, image, or text files.'));
    }
  },
});

export const uploadMiddleware = upload.single('file');

// ─── Upload Handler ───────────────────────────────────────────────────────────
export const uploadHealthRecord = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const userId = req.userId;
    const { title, category, date, notes } = req.body;

    if (!title || !category || !date) {
      return res.status(400).json({ error: 'title, category and date are required fields.' });
    }

    let blobUrl: string | null = null;
    let blobName: string | null = null;

    // ── Upload to Azure Blob Storage if connection string is configured ─────
    if (AZURE_STORAGE_CONNECTION_STRING) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
      const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

      // Ensure container exists (private — storage account has public access disabled)
      await containerClient.createIfNotExists();

      const ext = req.file.originalname.split('.').pop();
      blobName = `${userId}/${uuidv4()}.${ext}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
        metadata: {
          userId: userId || '',
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      blobUrl = blockBlobClient.url;
    }

    // ── Create MedicalRecord stub in MongoDB ─────────────────────────────────
    const record = new MedicalRecordModel({
      userId,
      title,
      category,
      date,
      description: blobUrl
        ? `Uploaded file: ${req.file.originalname}`
        : `File uploaded locally: ${req.file.originalname}`,
      notes: notes || '',
      blobUrl: blobUrl || undefined,
      blobName: blobName || undefined,
      processingStatus: blobUrl ? 'pending' : 'none',
    });

    const saved = await record.save();

    return res.status(201).json({
      message: blobUrl
        ? 'File uploaded to Azure Blob Storage. Processing by Azure Function will begin shortly.'
        : 'File upload recorded (Azure Storage not configured — connection string missing).',
      record: saved,
      blobUrl,
      processingStatus: saved.processingStatus,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'File upload failed.' });
  }
};

// ─── Get processing status ────────────────────────────────────────────────────
export const getUploadStatus = async (req: Request, res: Response) => {
  try {
    const record = await MedicalRecordModel.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    return res.json({
      processingStatus: record.processingStatus,
      extractedText: record.extractedText,
      blobUrl: record.blobUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
