const express = require('express');
const router = express.Router();
const { geminiLimiter } = require('../middleware/rateLimiter');
const { explainAttackResults, generatePrivacyRecommendations } = require('../services/geminiService');

// Explain a specific attack result
// router.post('/explain', geminiLimiter, async (req, res) => {
//   const { attackType, results } = req.body;
//   if (!attackType || !results) {
//     return res.status(400).json({ error: 'attackType and results required' });
//   }
//   try {
//     const explanation = await explainAttackResults(attackType, results);
//     res.json({ explanation });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// Get privacy recommendations
router.post('/recommendations', geminiLimiter, async (req, res) => {
  const { results } = req.body;
  if (!results) return res.status(400).json({ error: 'results required' });
  try {
    const recommendations = await generatePrivacyRecommendations(results);
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;