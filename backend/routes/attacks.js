const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { attackLimiter } = require('../middleware/rateLimiter');
const { callFlask } = require('../services/flaskService');
const { explainAttackResults } = require('../services/geminiService');
const fs = require('fs');

// Helper to clean up uploaded file
const cleanup = (filePath) => {
  try { fs.unlinkSync(filePath); } catch (e) {}
};

// Run single attack
router.post('/:attackType', attackLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { attackType } = req.params;
  const validAttacks = ['recon', 'linkage', 'inference', 'membership', 'deanon'];

  if (!validAttacks.includes(attackType)) {
    cleanup(req.file.path);
    return res.status(400).json({ error: `Invalid attack type. Valid: ${validAttacks.join(', ')}` });
  }

  try {
    // Call Flask attack engine
    const results = await callFlask(`/api/${attackType}`, req.file.path);

    // Get Gemini explanation
    let aiExplanation = null;
    try {
      aiExplanation = await explainAttackResults(attackType, results);
    } catch (geminiErr) {
      console.warn('Gemini explanation failed:', geminiErr.message);
    }

    cleanup(req.file.path);
    res.json({ results, aiExplanation, attackType });

  } catch (err) {
    cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// Run all attacks
router.post('/run/all', attackLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const attacks = ['recon', 'linkage', 'inference', 'membership', 'deanon'];
  const results = {};
  const explanations = {};

  try {
    for (const attack of attacks) {
      try {
        results[attack] = await callFlask(`/api/${attack}`, req.file.path);
        try {
          explanations[attack] = await explainAttackResults(attack, results[attack]);
        } catch (e) {
          explanations[attack] = null;
        }
      } catch (e) {
        results[attack] = { error: e.message };
      }
    }

    // Overall score
    const scores = {
      recon: results.recon?.overall_risk_score || 0,
      linkage: results.linkage?.linkage_risk_score || 0,
      inference: results.inference?.inference_risk_score || 0,
      membership: results.membership?.membership_risk_score || 0,
      deanon: results.deanon?.deanon_risk_score || 0,
    };
    const overallScore = Math.round(
      Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).filter(s => s > 0).length
    );

    // Get recommendations
    let recommendations = null;
    try {
      const { generatePrivacyRecommendations } = require('../services/geminiService');
      recommendations = await generatePrivacyRecommendations({ ...results, overallScore });
    } catch (e) {
      console.warn('Recommendations failed:', e.message);
    }

    cleanup(req.file.path);
    res.json({ results, explanations, overallScore, recommendations });

  } catch (err) {
    cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;