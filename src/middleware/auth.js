import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';

export function requireAuth(role) {
  return (req, res, next) => {
    try {
      const token = req.cookies?.access_token;
      if (!token) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (role && payload.role !== role) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'Forbidden' });
      }
      req.user = payload;
      next();
    } catch (e) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid token' });
    }
  };
}

export function setAuthCookies(res, accessToken) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token');
}


