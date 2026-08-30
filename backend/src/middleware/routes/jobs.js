const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function rowToJob(row) {
  return { id: row.id, company: row.company, role: row.role, status: row.status, date: row.date, notes: row.notes };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ jobs: rows.map(rowToJob) });
});

router.post('/', (req, res) => {
  const { company, role, status, date, notes } = req.body || {};
  if (!company || !role) return res.status(400).json({ error: 'Company and role are required' });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO jobs (id, user_id, company, role, status, date, notes, created_at) VALUES (?,?,?,?,?,?,?,?)').run(
    id, req.user.id, company, role, status || 'Saved', date || '', notes || '', Date.now()
  );
  res.status(201).json({ job: rowToJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)) });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Application not found' });
  const { company, role, status, date, notes } = req.body || {};
  db.prepare('UPDATE jobs SET company=?, role=?, status=?, date=?, notes=? WHERE id=?').run(
    company ?? existing.company, role ?? existing.role, status ?? existing.status, date ?? existing.date, notes ?? existing.notes, req.params.id
  );
  res.json({ job: rowToJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id)) });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM jobs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Application not found' });
  res.json({ ok: true });
});

module.exports = router;