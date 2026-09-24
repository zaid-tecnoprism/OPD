import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import patientRoutes from './routes/patients.js';
import visitRoutes from './routes/visits.js';
import doctorRoutes from './routes/doctors.js';
import departmentRoutes from './routes/departments.js';
import medicineRoutes from './routes/medicines.js';
import testRoutes from './routes/tests.js';
import prescriptionRoutes from './routes/prescriptions.js';
import billingRoutes from './routes/bills.js';
import tokenRoutes from './routes/tokens.js';
import pharmacyRoutes from './routes/pharmacy.js';
import testCenterRoutes from './routes/testCenter.js';
import agentRoutes from './routes/agents.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';

import { seedData } from './data/seed.js';
import auditMiddleware from './middleware/audit.js';

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL_RAW = process.env.FRONTEND_URL || 'https://opd-lsx7.onrender.com';

const allowedOrigins = Array.from(new Set([
  ...FRONTEND_URL_RAW.split(',').map(s => s.trim()).filter(Boolean),
  'https://opd-lsx7.onrender.com',
  'http://127.0.0.1:5173',
  'https://localhost:5173'
]));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}. Add to FRONTEND_URL env var (comma-separated).`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Actor']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(auditMiddleware.auditRequest);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      hospitalName: process.env.HOSPITAL_NAME || 'City General Hospital'
    },
    message: 'OPD Backend is running'
  });
});

app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/bills', billingRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/test-center', testCenterRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.url} not found`
    }
  });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
});

seedData().then(() => {
  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  OPD Backend Server`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Frontend: ${process.env.FRONTEND_URL}`);
    console.log(`  API: http://localhost:${PORT}/api`);
    console.log(`========================================`);
  });
});
