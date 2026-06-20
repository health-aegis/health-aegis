const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');
const morgan     = require('morgan');
const router     = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { Medication, Caregiver, SystemStatus } = require('./models/models');

dotenv.config();

const app         = express();
const PORT        = process.env.PORT || 5002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-health-agent';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/', router);
app.use(notFound);
app.use(errorHandler);

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('[medication-service] Connected to MongoDB');

    app.listen(PORT, () =>
      console.log(`[medication-service] Running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('[medication-service] DB connection failed:', err.message);
    process.exit(1);
  });
