require('dotenv').config();
const express = require('express');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/properties', require('./routes/properties'));
app.use('/api/enquiries',  require('./routes/enquiries'));
app.use('/api/admin',      require('./routes/admin'));

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
