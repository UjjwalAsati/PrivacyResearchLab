const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { generalLimiter } = require('../middleware/rateLimiter');
const { callFlask } = require('../services/flaskService');
const fs = require('fs');

const cleanup = (filePath) => {
  try { fs.unlinkSync(filePath); } catch (e) {}
};

router.post('/analyze', generalLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const results = await callFlask('/api/defense/analyze', req.file.path);
    cleanup(req.file.path);
    res.json(results);
  } catch (err) {
    cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

router.post('/apply', generalLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const fixes = req.body.fixes || '[]';
    const results = await callFlask('/api/defense/apply', req.file.path, { fixes });
    cleanup(req.file.path);
    res.json(results);
  } catch (err) {
    cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;