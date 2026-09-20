const express = require('express');
const db = require('../db');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// No auth on this route on purpose - this is what makes the link shareable.
// Still gated on both the resume's own is_public flag AND the owner
// currently being on premium, so a lapsed subscription silently turns the
// link off rather than leaving old shares live forever.
router.get('/:id', asyncHandler(async (req, res) => {
  const row = await db.get(
    `SELECT r.name, r.template, r.color, r.data, u.name AS owner_name, u.plan AS owner_plan
     FROM resumes r JOIN users u ON u.id = r.user_id
     WHERE r.id = $1 AND r.is_public = true`,
    [req.params.id]
  );

  if (!row || row.owner_plan !== 'premium') {
    return res.status(404).json({ error: 'This resume is not shared publicly' });
  }

  res.json({
    resume: { name: row.name, template: row.template, color: row.color, data: JSON.parse(row.data) },
    ownerName: row.owner_name,
  });
}));

module.exports = router;
