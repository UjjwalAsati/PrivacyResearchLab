const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

// ✅ Import BOTH limiters
const { attackLimiter, geminiLimiter } = require('../middleware/rateLimiter');

const { callFlask } = require('../services/flaskService');
const { explainAttackResults, generatePrivacyRecommendations } = require('../services/geminiService');

const fs = require('fs');

// Helper to clean up uploaded file
const cleanup = (filePath) => {
  try { fs.unlinkSync(filePath); } catch (e) {}
};

// ===============================
// 🚀 Run single attack
// ===============================
router.post('/:attackType', attackLimiter, geminiLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { attackType } = req.params;
  const validAttacks = ['recon', 'linkage', 'inference', 'membership', 'deanon'];

  if (!validAttacks.includes(attackType)) {
    cleanup(req.file.path);
    return res.status(400).json({ error: `Invalid attack type. Valid: ${validAttacks.join(', ')}` });
  }

  try {
    // 🔹 Step 1: Call Flask
    const results = await callFlask(`/api/${attackType}`, req.file.path);

    // 🔹 Step 2: Prepare CLEAN data for Gemini (IMPORTANT)
    const summarized = {
      risk: results?.overall_risk_level,
      score: results?.overall_risk_score,
      sensitive_columns: results?.sensitive_columns?.length,
      quasi_identifiers: results?.quasi_identifiers?.length
    };

    // 🔹 Step 3: Call Gemini
    let aiExplanation = null;
    try {
      aiExplanation = await explainAttackResults(attackType, summarized);
    } catch (geminiErr) {
      console.error('❌ Gemini failed:', {
        attackType,
        error: geminiErr.message
      });
    }

    cleanup(req.file.path);

    // ✅ Clean response
    res.json({
      success: true,
      attackType,
      results,
      aiExplanation
    });

  } catch (err) {
    cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 🚀 Run ALL attacks
// ===============================
router.post('/run/all', attackLimiter, geminiLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const attacks = ['recon', 'linkage', 'inference', 'membership', 'deanon'];
  const results = {};
  const explanations = {}; // kept for structure (not used)

  try {
    // ❌ NO Gemini here (avoid duplicate calls)
    for (const attack of attacks) {
      try {
        results[attack] = await callFlask(`/api/${attack}`, req.file.path);
        explanations[attack] = null;
      } catch (e) {
        results[attack] = { error: e.message };
      }
    }

    // 🔹 Calculate overall score
    const scores = {
      recon: results.recon?.overall_risk_score || 0,
      linkage: results.linkage?.linkage_risk_score || 0,
      inference: results.inference?.inference_risk_score || 0,
      membership: results.membership?.membership_risk_score || 0,
      deanon: results.deanon?.deanon_risk_score || 0,
    };

    const validScores = Object.values(scores).filter(s => s > 0);
    const overallScore = validScores.length
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : 0;

    // 🔹 Gemini ONLY for recommendations
    let recommendations = null;
    try {
      recommendations = await generatePrivacyRecommendations({ ...results, overallScore });
    } catch (e) {
      console.warn('⚠️ Recommendations failed:', e.message);
    }

    cleanup(req.file.path);

    res.json({
      success: true,
      results,
      explanations, // always null (frontend won’t use)
      overallScore,
      recommendations
    });

  } catch (err) {
    cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;