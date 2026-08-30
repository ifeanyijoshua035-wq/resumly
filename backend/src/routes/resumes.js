const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requirePremium } = require('../middleware/auth');

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

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json({ resumes: rows.map(rowToResume) });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Resume not found' });
  res.json({ resume: rowToResume(row) });
});

router.post('/', (req, res) => {
  const { name, template, color, data } = req.body || {};
  const lockErr = rejectIfLockedTemplate(template, req.user);
  if (lockErr) return res.status(403).json(lockErr);

  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare('INSERT INTO resumes (id, user_id, name, template, color, data, updated_at) VALUES (?,?,?,?,?,?,?)').run(
    id, req.user.id, name || 'Untitled resume', template || 'classic', color || '#2453B8', JSON.stringify(data || blankData()), now
  );
  const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(id);
  res.status(201).json({ resume: rowToResume(row) });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Resume not found' });
  const { name, template, color, data } = req.body || {};
  const lockErr = rejectIfLockedTemplate(template, req.user);
  if (lockErr) return res.status(403).json(lockErr);

  const now = Date.now();
  db.prepare('UPDATE resumes SET name = ?, template = ?, color = ?, data = ?, updated_at = ? WHERE id = ?').run(
    name ?? existing.name,
    template ?? existing.template,
    color ?? existing.color,
    data ? JSON.stringify(data) : existing.data,
    now,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  res.json({ resume: rowToResume(row) });
});

router.post('/:id/duplicate', (req, res) => {
  const existing = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Resume not found' });
  // A resume can end up on a premium template if the user later downgrades -
  // don't let duplicating be a way to keep minting more of them for free.
  const template = PREMIUM_TEMPLATES.has(existing.template) && req.user.plan !== 'premium' ? 'classic' : existing.template;
  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare('INSERT INTO resumes (id, user_id, name, template, color, data, updated_at) VALUES (?,?,?,?,?,?,?)').run(
    id, req.user.id, existing.name + ' (copy)', template, existing.color, existing.data, now
  );
  const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(id);
  res.status(201).json({ resume: rowToResume(row) });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM resumes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Resume not found' });
  res.json({ ok: true });
});

// Turning a resume into a live public link (the real version of the
// "personal website / portfolio link" premium feature) is itself premium -
// gated here, server-side, same as AI and ATS.
router.put('/:id/visibility', requirePremium, (req, res) => {
  const existing = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Resume not found' });
  const isPublic = !!(req.body || {}).isPublic;
  db.prepare('UPDATE resumes SET is_public = ? WHERE id = ?').run(isPublic ? 1 : 0, req.params.id);
  const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  res.json({ resume: rowToResume(row) });
});

module.exports = router;
