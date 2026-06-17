const express      = require('express');
const router       = express.Router();
const db           = require('../db');
const requireAdmin = require('../middleware/auth');

// GET /api/properties
// Query params: type, listing, location, priceMin, priceMax, search
router.get('/', (req, res) => {
  const { type, listing, location, priceMin, priceMax, search } = req.query;

  let sql = 'SELECT * FROM properties WHERE 1=1';
  const params = [];

  if (type)     { sql += ' AND type = ?';                    params.push(type); }
  if (listing)  { sql += ' AND listing = ?';                 params.push(listing); }
  if (location) { sql += ' AND location LIKE ?';             params.push(`%${location}%`); }
  if (priceMin) { sql += ' AND price >= ?';                  params.push(Number(priceMin)); }
  if (priceMax && Number(priceMax) < 999999999) {
                  sql += ' AND price <= ?';                   params.push(Number(priceMax)); }
  if (search)   { sql += ' AND (title LIKE ? OR location LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY created_at DESC';

  const properties = db.prepare(sql).all(...params);
  res.json({ success: true, count: properties.length, data: properties });
});

// GET /api/properties/:id
router.get('/:id', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
  res.json({ success: true, data: property });
});

// POST /api/properties
router.post('/', requireAdmin, (req, res) => {
  const { title, type, listing, price, location, bedrooms, bathrooms, size,
          parking, pool, gym, security, furnished, gradient, icon, description, images } = req.body;

  if (!title || !type || !listing || !price || !location || !size) {
    return res.status(400).json({ success: false, message: 'title, type, listing, price, location and size are required' });
  }

  const imagesJson = Array.isArray(images) ? JSON.stringify(images) : (images ?? '[]');

  const result = db.prepare(`
    INSERT INTO properties
      (title, type, listing, price, location, bedrooms, bathrooms, size, parking, pool, gym, security, furnished, gradient, icon, description, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, type, listing, price, location, bedrooms ?? null, bathrooms ?? null, size,
         parking ? 1 : 0, pool ? 1 : 0, gym ? 1 : 0, security ? 1 : 0, furnished ? 1 : 0,
         gradient ?? null, icon ?? null, description ?? null, imagesJson);

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: property });
});

// PUT /api/properties/:id
router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Property not found' });

  const allowed = ['title','type','listing','price','location','bedrooms','bathrooms','size',
                   'parking','pool','gym','security','furnished','gradient','icon','description','images'];
  const sets = [], params = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = ?`);
      const val = field === 'images' && Array.isArray(req.body[field])
        ? JSON.stringify(req.body[field])
        : req.body[field];
      params.push(val);
    }
  }

  if (sets.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE properties SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: property });
});

// DELETE /api/properties/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Property not found' });

  db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Property deleted successfully' });
});

module.exports = router;
