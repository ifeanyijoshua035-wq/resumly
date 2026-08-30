const express = require('express');
const db = require('../db');
const { requireAuth, requirePremium } = require('../middleware/auth');
const { computeAts } = require('../utils/ats');

const router = express.Router();
router.use(requireAuth);

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error('Gemini returned no content');
  return text.trim();
}

function buildPrompt(tool, input, resume) {
  const p = resume ? resume.personal : {};
  const bg = resume
    ? `Candidate background: ${p.jobTitle || ''}. ${p.summary || ''} Skills: ${(resume.skills || []).map((s) => s.name).join(', ')}.`
    : '';
  switch (tool) {
    case 'writer':
      return `Write a punchy, specific 3-sentence professional resume summary for this focus: "${input}". ${bg} Return only the summary text.`;
    case 'cover':
      return `Write a concise cover letter (under 300 words) based on this job description: "${input}". ${bg} Return only the letter body, no placeholders in brackets.`;
    case 'interview':
      return `List 8 likely interview questions (mix of behavioral and technical) for: "${input}". ${bg} Return as a plain numbered list, no extra commentary.`;
    case 'grammar':
      return `Proofread and lightly tighten this text for a resume. Fix grammar, remove filler, keep the meaning. Return only the corrected text: "${input}"`;
    case 'improve':
      return `Review this resume and give 5 specific, actionable improvement suggestions as a short bulleted list. ${bg} Focus area if any: "${input}"`;
    default:
      return input;
  }
}

router.post('/generate', requirePremium, async (req, res) => {
  const { tool, input, resumeId } = req.body || {};
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key is not configured on the server' });

  let resume = null;
  if (resumeId) {
    const row = db.prepare('SELECT data FROM resumes WHERE id = ? AND user_id = ?').get(resumeId, req.user.id);
    if (row) resume = JSON.parse(row.data);
  }

  try {
    const prompt = buildPrompt(tool, input || '', resume);
    const text = await callGemini(prompt);
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: err.message || 'AI request failed' });
  }
});

router.post('/ats-check', requirePremium, (req, res) => {
  const { resumeId, jobDescription } = req.body || {};
  if (!resumeId || !jobDescription) return res.status(400).json({ error: 'resumeId and jobDescription are required' });
  const row = db.prepare('SELECT data FROM resumes WHERE id = ? AND user_id = ?').get(resumeId, req.user.id);
  if (!row) return res.status(404).json({ error: 'Resume not found' });
  const result = computeAts(JSON.parse(row.data), jobDescription);
  res.json(result);
});

module.exports = router;
