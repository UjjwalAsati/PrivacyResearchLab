const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { generalLimiter } = require('../middleware/rateLimiter');
const { callFlask } = require('../services/flaskService');
const { analyzeTClosenessViolations } = require('../services/geminiService');
const fs = require('fs');

const cleanup = (filePath) => {
  try { fs.unlinkSync(filePath); } catch (e) {}
};

router.post('/', generalLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { k = 5, l = 2, t = 0.25, gen_level = 1 } = req.body;

  try {
    const results = await callFlask('/api/anonymize', req.file.path, { k, l, t, gen_level });

    // Add Gemini analysis of t-closeness violations if any
    let tAnalysis = null;
    if (results.report?.t_closeness && !results.report.t_closeness.satisfied) {
      try {
        tAnalysis = await analyzeTClosenessViolations(
          results.report.t_closeness,
          req.file.originalname
        );
      } catch (e) {
        console.warn('t-closeness analysis failed:', e.message);
      }
    }

    cleanup(req.file.path);
    res.json({ ...results, tClosenessAnalysis: tAnalysis });

  } catch (err) {
    cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;