import { Request, Response } from 'express';
import { MedicalRecordModel } from '../models/models';

/**
 * GET /api/history/documents
 * Returns all OCR-processed documents (blobUrl is set) for the authenticated user.
 * Since we use Cosmos DB for MongoDB, all records are in the same MongoDB collection.
 * The Azure Function writes directly to the medicalrecords collection via Mongoose.
 */
export const getProcessedDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // Fetch records that have a blobUrl (i.e. were uploaded as files, not manually entered)
    const documents = await MedicalRecordModel.find({
      userId,
      blobUrl: { $exists: true, $ne: null },
    });

    documents.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return res.json(documents);
  } catch (error: any) {
    console.error('Error fetching processed documents:', error);
    return res.status(500).json({ error: 'Failed to fetch processed documents.' });
  }
};
