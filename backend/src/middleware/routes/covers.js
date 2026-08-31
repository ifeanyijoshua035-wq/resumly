const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth);

function rowToCover(row) {
  return { id: row.id, title: row.title, body: row.body, updatedAt: row.updated_at };
}

router.get('/', asyncHandler(async (req, res) => {
  const rows = await db.all('SELECT * FROM cover_letters WHERE user_id = $1 ORDER BY updated_at DESC', [req.user.id]);
  res.json({ covers: rows.map(rowToCover) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { title, body } = req.body || {};
  const id = crypto.randomUUID();
  const now = Date.now();
  const row = await db.get(
    'INSERT INTO cover_letters (id, user_id, title, body, updated_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [id, req.user.id, title || 'Untitled letter', body || '', now]
  );
  res.status(201).json({ cover: rowToCover(row) });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await db.get('SELECT * FROM cover_letters WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Cover letter not found' });
  const { title, body } = req.body || {};
  const row = await db.get(
    'UPDATE cover_letters SET title = $1, body = $2, updated_at = $3 WHERE id = $4 RETURNING *',
    [title ?? existing.title, body ?? existing.body, Date.now(), req.params.id]
  );
  res.json({ cover: rowToCover(row) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db.run('DELETE FROM cover_letters WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Cover letter not found' });
  res.json({ ok: true });
}));

module.exports = router;