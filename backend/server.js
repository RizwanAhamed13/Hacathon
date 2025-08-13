// Helper to log errors
function logError(context, err) {
  console.error(`[ERROR] ${context}:`, err && err.stack ? err.stack : err);
}
process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});
process.on('SIGINT', () => {
  console.log('Received SIGINT (Ctrl+C). Shutting down server...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down server...');
  process.exit(0);
});

console.log('Loading environment variables...');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
console.log('Environment variables loaded.');


console.log('Initializing Express app...');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
console.log('Express app initialized. PORT:', PORT);

// ✅ Use express.json() BEFORE the routes

console.log('Registering middlewares...');
try {
  app.use(express.json());
    // Serve static files from public directory
    app.use(express.static(path.join(__dirname, '../public')));
  console.log('Middlewares registered.');
} catch (err) {
  logError('Registering middlewares', err);
}
// Default route (login.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/auth/login.html'));
});
console.log('Middlewares registered.');

// ✅ CORS middleware (also before routes)

try {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  console.log('CORS middleware registered.');
} catch (err) {
  logError('Registering CORS middleware', err);
}



console.log('Loading routes...');

const QF07Router = require('./QF07_FBQ_02');
const QF07FBQ03Router = require('./QF07_FBQ_03');
const timeStudyRouter = require('./timeStudyRoutes');
const qcRegisterRouter = require('./qcRegisterRoutes');
const microCouponRouter = require('./microCouponRoutes');
const inspectionRegisterRouter = require('./inspectionRegisterRoutes');
const tensileTestReportRouter = require('./tensileTestReportRoutes');
const microstructureAnalysisRoutes = require('./microstructureAnalysisRoutes');
const inspectionResultReportRouter = require('./inspectionResultReportRoutes');
const impactTestReportRouter = require('./impactTestReportRoutes');
const rejectionAnalysisRegisterRouter = require('./rejectionAnalysisRegisterRoutes');
const hardnessTestRecordRouter = require('./hardnessTestRecordRoutes');
const carbonSulphurLecoAnalysisRegisterRouter = require('./carbonSulphurLecoAnalysisRegisterRoutes');
const errorProofVerificationChecklistFDYRouter = require('./errorProofVerificationChecklistFDYRoutes');
const authRouter = require('./auth/authRoutes').router;
const listUsersRouter = require('./admin/listUsersRoutes 2');

console.log('Registering routes...');
try {
  console.log('Registering routes...');
  app.use('/', QF07Router);
  app.use('/', QF07FBQ03Router);
  app.use('/', timeStudyRouter);
  app.use('/', qcRegisterRouter);
  app.use('/', microCouponRouter);
  app.use('/', inspectionRegisterRouter);
  app.use('/', tensileTestReportRouter);
  app.use('/api/microstructure-analysis', microstructureAnalysisRoutes);
  app.use('/', inspectionResultReportRouter);
  app.use('/', impactTestReportRouter);
  app.use('/', rejectionAnalysisRegisterRouter);
  app.use('/', hardnessTestRecordRouter);
  app.use('/', carbonSulphurLecoAnalysisRegisterRouter);
  app.use('/', errorProofVerificationChecklistFDYRouter);
  app.use('/auth', authRouter);
  app.use('/admin', listUsersRouter);
  console.log('Routes registered.');
} catch (err) {
  logError('Registering routes', err);
}

console.log('Starting server...');
try {
  app.listen(PORT, (err) => {
    if (err) {
      logError('Error starting server', err);
    } else {
      console.log(`Server running on port ${PORT}`);
    }
  });
} catch (err) {
  logError('app.listen exception', err);
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});