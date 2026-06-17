require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const db      = require('./db');

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^(image|video)\//i.test(file.mimetype);
    cb(ok ? null : new Error('Only image and video files are allowed'), ok);
  },
});

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/properties', require('./routes/properties'));
app.use('/api/enquiries',  require('./routes/enquiries'));
app.use('/api/admin',      require('./routes/admin'));

// POST /api/upload  (admin only)
const requireAdmin = require('./middleware/auth');
app.post('/api/upload', requireAdmin, upload.array('files', 20), (req, res) => {
  const urls = req.files.map(f => '/uploads/' + f.filename);
  res.json({ success: true, urls });
});

// DELETE /api/upload  (admin only)
app.delete('/api/upload', requireAdmin, (req, res) => {
  const { url } = req.body;
  if (!url || !url.startsWith('/uploads/')) return res.status(400).json({ success: false });
  const filePath = path.join(__dirname, 'public', url);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ success: true });
});

// Public read-only settings endpoint (used by the front-end)
app.get('/api/settings', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM site_settings WHERE key != 'admin_password'").all();
  const data = {};
  rows.forEach(r => { data[r.key] = r.value; });
  res.json({ success: true, data });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Heritage Realtor  →  http://localhost:${PORT}`);
  console.log(`  Admin panel       →  http://localhost:${PORT}/admin.html\n`);
});
