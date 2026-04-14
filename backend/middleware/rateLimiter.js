const rateLimit = require('express-rate-limit');

const attackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attack requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const geminiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many AI requests. Please wait a minute.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests.' },
});

module.exports = { attackLimiter, geminiLimiter, generalLimiter };