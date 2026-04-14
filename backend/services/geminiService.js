const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use the current stable 2026 model for Free Tier
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to handle API calls with retry logic for 503/429 errors
 */
async function safeGeminiPost(payload) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        try {
            const response = await axios.post(GEMINI_URL, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });
            return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        } catch (e) {
            const status = e.response?.status;
            if ((status === 503 || status === 429) && attempts < maxAttempts - 1) {
                attempts++;
                const waitTime = 3000 * attempts;
                console.log(`⚠️ Gemini busy (${status}). Retrying in ${waitTime/1000}s...`);
                await delay(waitTime);
            } else {
                console.error(`❌ Gemini API Error: ${status || 'Network Error'} - ${e.response?.data?.error?.message || e.message}`);
                return null;
            }
        }
    }
}

async function explainAttackResults(attackType, results) {
    const prompts = {
        recon: `You are a data privacy expert. Analyze these reconnaissance attack results: ${JSON.stringify(results)}. Explain in 3-4 sentences what they mean for a non-technical audience.`,
        linkage: `You are a data privacy expert. Explain these linkage attack results: ${JSON.stringify(results)}. Focus on re-identification risks.`,
        inference: `You are a data privacy expert. Explain these attribute inference results: ${JSON.stringify(results)}.`,
        membership: `You are a data privacy expert. Explain membership inference results: ${JSON.stringify(results)}.`,
        deanon: `You are a data privacy expert. Explain de-anonymization results: ${JSON.stringify(results)}.`,
        anonymization: `You are a data privacy expert. Explain k-Anonymity, l-Diversity, and t-Closeness based on: ${JSON.stringify(results)}.`
    };

    const prompt = prompts[attackType] || `Explain these results: ${JSON.stringify(results)}`;
    
    await delay(2000); // 2-second safety delay

    const text = await safeGeminiPost({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
    });

    return text || 'Unable to generate explanation.';
}

async function generatePrivacyRecommendations(allResults) {
    const prompt = `You are a data privacy expert. Based on these results: ${JSON.stringify(allResults)}, provide 5 actionable recommendations to protect the dataset.`;
    
    await delay(2000);

    const text = await safeGeminiPost({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 500 }
    });

    return text || 'Unable to generate recommendations.';
}

async function analyzeTClosenessViolations(tResults, datasetName) {
    const prompt = `Explain t-Closeness violations for ${datasetName}: ${JSON.stringify(tResults)}`;
    
    await delay(2000);

    const text = await safeGeminiPost({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 200 }
    });

    return text || 'Unable to analyze violations.';
}

// CRITICAL: Ensure these names match what you are calling in your routes/controllers
module.exports = { 
    explainAttackResults, 
    generatePrivacyRecommendations, 
    analyzeTClosenessViolations 
};