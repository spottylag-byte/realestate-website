const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/enquiries — submit a contact/property enquiry
router.post('/', (req, res) => {
  const { name, phone, email, interest, property_type, message, property_id } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'name and phone are required' });
  }

  const result = db.prepare(`
    INSERT INTO enquiries (name, phone, email, interest, property_type, message, property_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, email ?? null, interest ?? null, property_type ?? null,
         message ?? null, property_id ?? null);

  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: enquiry });
});

// GET /api/enquiries — list all enquiries
router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM enquiries';
  const params = [];

  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';

  const enquiries = db.prepare(sql).all(...params);
  res.json({ success: true, count: enquiries.length, data: enquiries });
});

// GET /api/enquiries/:id
router.get('/:id', (req, res) => {
  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id);
  if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });
  res.json({ success: true, data: enquiry });
});

// PATCH /api/enquiries/:id/status — update status (new | in-progress | resolved)
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['new', 'in-progress', 'resolved'];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${valid.join(', ')}` });
  }

  const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Enquiry not found' });

  db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, req.params.id);
  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: enquiry });
});

module.exports = router;
