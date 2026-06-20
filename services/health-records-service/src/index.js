const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');
const morgan     = require('morgan');
const router     = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { MedicalRecord, Appointment } = require('./models/models');

dotenv.config();

const app         = express();
const PORT        = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-health-agent';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', router);

// ─── 404 & Error ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── DB + Seed + Start ───────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('[health-records-service] Connected to MongoDB');

    app.listen(PORT, () =>
      console.log(`[health-records-service] Running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('[health-records-service] DB connection failed:', err.message);
    process.exit(1);
  });
