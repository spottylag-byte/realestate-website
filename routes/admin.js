const express      = require('express');
const router       = express.Router();
const db           = require('../db');
const requireAdmin = require('../middleware/auth');

// POST /api/admin/login
router.post('/login', (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// GET /api/admin/settings
router.get('/settings', requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT key, value FROM site_settings WHERE key != 'admin_password'").all();
  const data = {};
  rows.forEach(r => { data[r.key] = r.value; });
  res.json({ success: true, data });
});

// PUT /api/admin/settings
router.put('/settings', requireAdmin, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  db.transaction(() => {
    for (const [key, value] of Object.entries(req.body)) {
      if (key !== 'admin_password') upsert.run(key, String(value));
    }
  })();
  res.json({ success: true });
});

// GET /api/admin/enquiries
router.get('/enquiries', requireAdmin, (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM enquiries';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  res.json({ success: true, data: db.prepare(sql).all(...params) });
});

// GET /api/admin/enquiries/:id
router.get('/enquiries/:id', requireAdmin, (req, res) => {
  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id);
  if (!enquiry) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: enquiry });
});

// PATCH /api/admin/enquiries/:id/status
router.patch('/enquiries/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!['new', 'in-progress', 'resolved'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  if (!db.prepare('SELECT id FROM enquiries WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// POST /api/admin/change-password
router.post('/change-password', requireAdmin, (req, res) => {
  const { current, next } = req.body;
  if (current !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }
  if (!next || next.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('admin_password', ?)").run(next);
  process.env.ADMIN_PASSWORD = next;
  res.json({ success: true });
});

module.exports = router;
