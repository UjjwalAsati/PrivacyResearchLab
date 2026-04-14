const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const FLASK_URL = process.env.FLASK_URL || 'http://127.0.0.1:5000';

async function callFlask(endpoint, filePath, extraFields = {}) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: 'dataset.csv',
    contentType: 'text/csv'
  });

  // Add extra form fields
  Object.entries(extraFields).forEach(([key, value]) => {
    form.append(key, String(value));
  });

  const response = await axios.post(`${FLASK_URL}${endpoint}`, form, {
    headers: form.getHeaders(),
    timeout: 300000, // 5 minutes for ML attacks
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  return response.data;
}

async function checkFlaskHealth() {
  try {
    const response = await axios.get(`${FLASK_URL}/api/health`, { timeout: 5000 });
    return { online: true, message: response.data.status };
  } catch (err) {
    return { online: false, message: 'Flask engine offline' };
  }
}

module.exports = { callFlask, checkFlaskHealth };