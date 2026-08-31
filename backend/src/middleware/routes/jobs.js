const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth);

function rowToJob(row) {
  return { id: row.id, company: row.company, role: row.role, status: row.status, date: row.date, notes: row.notes };
}

router.get('/', asyncHandler(async (req, res) => {
  const rows = await db.all('SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ jobs: rows.map(rowToJob) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { company, role, status, date, notes } = req.body || {};
  if (!company || !role) return res.status(400).json({ error: 'Company and role are required' });
  const id = crypto.randomUUID();
  const row = await db.get(
    'INSERT INTO jobs (id, user_id, company, role, status, date, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [id, req.user.id, company, role, status || 'Saved', date || '', notes || '', Date.now()]
  );
  res.status(201).json({ job: rowToJob(row) });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await db.get('SELECT * FROM jobs WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Application not found' });
  const { company, role, status, date, notes } = req.body || {};
  const row = await db.get(
    'UPDATE jobs SET company=$1, role=$2, status=$3, date=$4, notes=$5 WHERE id=$6 RETURNING *',
    [company ?? existing.company, role ?? existing.role, status ?? existing.status, date ?? existing.date, notes ?? existing.notes, req.params.id]
  );
  res.json({ job: rowToJob(row) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db.run('DELETE FROM jobs WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Application not found' });
  res.json({ ok: true });
}));

module.exports = router;