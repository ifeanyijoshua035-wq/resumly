const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function rowToCover(row) {
  return { id: row.id, title: row.title, body: row.body, updatedAt: row.updated_at };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM cover_letters WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json({ covers: rows.map(rowToCover) });
});

router.post('/', (req, res) => {
  const { title, body } = req.body || {};
  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare('INSERT INTO cover_letters (id, user_id, title, body, updated_at) VALUES (?,?,?,?,?)').run(
    id, req.user.id, title || 'Untitled letter', body || '', now
  );
  res.status(201).json({ cover: rowToCover(db.prepare('SELECT * FROM cover_letters WHERE id = ?').get(id)) });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cover_letters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Cover letter not found' });
  const { title, body } = req.body || {};
  db.prepare('UPDATE cover_letters SET title = ?, body = ?, updated_at = ? WHERE id = ?').run(
    title ?? existing.title, body ?? existing.body, Date.now(), req.params.id
  );
  res.json({ cover: rowToCover(db.prepare('SELECT * FROM cover_letters WHERE id = ?').get(req.params.id)) });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM cover_letters WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cover letter not found' });
  res.json({ ok: true });
});

module.exports = router;