import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autenticado'
      });
    }

    const token = authorization.slice(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Sesión inválida o expirada'
    });
  }
}
