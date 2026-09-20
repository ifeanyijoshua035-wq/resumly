const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requirePremium } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth);

const blankData = () => ({
  personal: { fullName: '', jobTitle: '', email: '', phone: '', location: '', website: '', summary: '' },
  experience: [], education: [], skills: [], certifications: [], languages: [], projects: [], references: [], hobbies: [],
});

// Must mirror the `premium:true` flags on LAYOUTS in public/app.js. Kept as a
// second, server-side check on purpose - the frontend hides these behind a
// lock icon for free users, but a request crafted directly against the API
// (bypassing the UI entirely) must still be rejected here, or "premium
// templates" would only be a decoration.
const PREMIUM_TEMPLATES = new Set(['elegant', 'creative']);

function rejectIfLockedTemplate(template, user) {
  if (template && PREMIUM_TEMPLATES.has(template) && user.plan !== 'premium') {
    return { error: 'This template is part of Premium', code: 'PREMIUM_REQUIRED' };
  }
  return null;
}

function rowToResume(row) {
  return { id: row.id, name: row.name, template: row.template, color: row.color, isPublic: !!row.is_public, updatedAt: row.updated_at, data: JSON.parse(row.data) };
}

router.get('/', asyncHandler(async (req, res) => {
  const rows = await db.all('SELECT * FROM resumes WHERE user_id = $1 ORDER BY updated_at DESC', [req.user.id]);
  res.json({ resumes: rows.map(rowToResume) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!row) return res.status(404).json({ error: 'Resume not found' });
  res.json({ resume: rowToResume(row) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, template, color, data } = req.body || {};
  const lockErr = rejectIfLockedTemplate(template, req.user);
  if (lockErr) return res.status(403).json(lockErr);

  const id = crypto.randomUUID();
  const now = Date.now();
  const row = await db.get(
    'INSERT INTO resumes (id, user_id, name, template, color, data, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [id, req.user.id, name || 'Untitled resume', template || 'classic', color || '#2453B8', JSON.stringify(data || blankData()), now]
  );
  res.status(201).json({ resume: rowToResume(row) });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await db.get('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Resume not found' });
  const { name, template, color, data } = req.body || {};
  const lockErr = rejectIfLockedTemplate(template, req.user);
  if (lockErr) return res.status(403).json(lockErr);

  const now = Date.now();
  const row = await db.get(
    'UPDATE resumes SET name = $1, template = $2, color = $3, data = $4, updated_at = $5 WHERE id = $6 RETURNING *',
    [name ?? existing.name, template ?? existing.template, color ?? existing.color, data ? JSON.stringify(data) : existing.data, now, req.params.id]
  );
  res.json({ resume: rowToResume(row) });
}));

router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const existing = await db.get('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Resume not found' });
  // A resume can end up on a premium template if the user later downgrades -
  // don't let duplicating be a way to keep minting more of them for free.
  const template = PREMIUM_TEMPLATES.has(existing.template) && req.user.plan !== 'premium' ? 'classic' : existing.template;
  const id = crypto.randomUUID();
  const now = Date.now();
  const row = await db.get(
    'INSERT INTO resumes (id, user_id, name, template, color, data, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [id, req.user.id, existing.name + ' (copy)', template, existing.color, existing.data, now]
  );
  res.status(201).json({ resume: rowToResume(row) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db.run('DELETE FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Resume not found' });
  res.json({ ok: true });
}));

// Turning a resume into a live public link (the real version of the
// "personal website / portfolio link" premium feature) is itself premium -
// gated here, server-side, same as AI and ATS.
router.put('/:id/visibility', requirePremium, asyncHandler(async (req, res) => {
  const existing = await db.get('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Resume not found' });
  const isPublic = !!(req.body || {}).isPublic;
  const row = await db.get('UPDATE resumes SET is_public = $1 WHERE id = $2 RETURNING *', [isPublic, req.params.id]);
  res.json({ resume: rowToResume(row) });
}));

module.exports = router;
