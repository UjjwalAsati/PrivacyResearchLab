const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ✅ Gemini endpoint
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===============================
// 🔐 Safe Gemini call with retry
// ===============================
async function safeGeminiPost(payload) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            const response = await axios.post(GEMINI_URL, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });
            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text || text.trim().length === 0) {
                console.warn("⚠️ Gemini returned empty response");
                return null;
            }

            return text; return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        } catch (e) {
            const status = e.response?.status;

            if ((status === 503 || status === 429) && attempts < maxAttempts - 1) {
                attempts++;
                const waitTime = 3000 * attempts;
                console.log(`⚠️ Gemini busy (${status}). Retrying in ${waitTime / 1000}s...`);
                await delay(waitTime);
            } else {
                console.error(`❌ Gemini API Error: ${status || 'Network Error'} - ${e.response?.data?.error?.message || e.message}`);
                return null;
            }
        }
    }
}

// ===============================
// 🤖 Explain attack results
// ===============================
async function explainAttackResults(attackType, results) {

    const basePrompt = `
    You are a senior data privacy expert.

    Analyze the following attack results:
    ${JSON.stringify(results, null, 2)}

    STRICTLY follow this format (NO markdown, NO bold, NO extra text):

    1. What happened: <one complete sentence>
    2. Why it is dangerous: <one complete sentence>
    3. Real-world impact: <one complete sentence>

    Rules:
    - DO NOT use ** or any markdown
    - DO NOT break sentences
    - DO NOT stop mid sentence
    - Each point must be complete
    - Maximum 100 words
    `;

    const attackContext = {
        recon: "Focus on exposed identifiers and risk discovery.",
        linkage: "Focus on re-identification risk and uniqueness.",
        inference: "Focus on prediction of sensitive attributes.",
        membership: "Focus on whether someone’s data presence can be detected.",
        deanon: "Focus on identity exposure and privacy breach.",
        anonymization: "Explain privacy protection techniques and their weaknesses."
    };

    const prompt = `${basePrompt}\nContext: ${attackContext[attackType] || ""}`;

    await delay(2000); // safety delay

    let text = await safeGeminiPost({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
        }
    });

    // 🔥 Retry once if failed
    if (!text) {
        console.log("🔁 Retrying Gemini...");
        await delay(2000);

        text = await safeGeminiPost({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 500
            }
        });
    }

    const cleaned = text
    ?.replace(/\*\*/g, '')   // remove **
    ?.replace(/\*/g, '')     // remove *
    ?.replace(/\n{2,}/g, '\n')
    ?.trim();

    return cleaned || '⚠️ AI could not generate explanation. Try again.';
}

// ===============================
// 🛡️ Generate recommendations
// ===============================
async function generatePrivacyRecommendations(allResults) {

    const prompt = `
You are a data privacy expert.

Based on the following attack results:
${JSON.stringify(allResults, null, 2)}

Provide EXACTLY 5 recommendations.

Format:
1. [Title]: Explanation
2. [Title]: Explanation
3. [Title]: Explanation
4. [Title]: Explanation
5. [Title]: Explanation

Rules:
- Each recommendation must be actionable
- Keep each under 30 words
- Avoid generic advice
`;

    await delay(2000);

    const text = await safeGeminiPost({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 400
        }
    });

    return text?.trim() || '⚠️ Unable to generate recommendations.';
}

// ===============================
// 📊 t-Closeness analysis
// ===============================
async function analyzeTClosenessViolations(tResults, datasetName) {

    const prompt = `
You are a data privacy expert.

Explain t-Closeness violations for dataset: ${datasetName}

Data:
${JSON.stringify(tResults, null, 2)}

Explain:
1. What violation occurred
2. Why it matters
3. Risk level

Keep it simple and under 100 words.
`;

    await delay(2000);

    const text = await safeGeminiPost({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
        }
    });

    return text?.trim() || '⚠️ Unable to analyze violations.';
}

// ===============================
// 📦 Export
// ===============================
module.exports = {
    explainAttackResults,
    generatePrivacyRecommendations,
    analyzeTClosenessViolations
};