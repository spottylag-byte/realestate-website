module.exports = function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};
