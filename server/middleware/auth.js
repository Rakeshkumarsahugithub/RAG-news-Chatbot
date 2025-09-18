import jwt from 'jsonwebtoken';

/**
 * Authentication middleware that verifies JWT tokens
 */
export const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Add user from payload
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'Admin access required' 
  });
};
