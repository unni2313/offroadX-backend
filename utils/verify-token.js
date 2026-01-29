const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'mudichidallamaa';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  console.log('--- Token Verification Check ---');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Auth Header Present:', !!authHeader);

  if (!token) {
    console.error('VERIFY ERROR: No token provided in header');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log('VERIFY SUCCESS: Token is valid. User ID:', decoded.id || decoded._id);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('VERIFY ERROR: JWT verification failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      console.error('Token expired at:', error.expiredAt);
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
