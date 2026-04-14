const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const attackRoutes = require('./routes/attacks');
const defenseRoutes = require('./routes/defense');
const anonymizeRoutes = require('./routes/anonymize');
const geminiRoutes = require('./routes/gemini');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

// ── Routes ──
app.use('/api/attacks', attackRoutes);
app.use('/api/defense', defenseRoutes);
app.use('/api/anonymize', anonymizeRoutes);
app.use('/api/gemini', geminiRoutes);

// ── Health ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'PrivacyBreachLab Node backend running!',
    flask: process.env.FLASK_URL,
    timestamp: new Date().toISOString()
  });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n💀 PrivacyBreachLab Node Backend`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`🐍 Flask engine at ${process.env.FLASK_URL}\n`);
});