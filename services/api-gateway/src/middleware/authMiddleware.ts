import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const JWT_SECRET = process.env.JWT_SECRET || 'aegis_super_secret_key_change_in_production';

// Entra ID Configuration
const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID;
const ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID;

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function(err, key: any) {
    if (err) return callback(err, null);
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Extend Express Request to carry userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRoles?: string[];
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided.' });
  }
  const token = authHeader.split(' ')[1];

  // If Entra ID is configured and the token is an Entra ID token, validate it
  if (ENTRA_TENANT_ID && ENTRA_CLIENT_ID) {
      jwt.verify(token, getKey, {
        audience: ENTRA_CLIENT_ID,
        issuer: `https://sts.windows.net/${ENTRA_TENANT_ID}/`
      }, (err, decoded: any) => {
        if (err) {
            // Fallback to legacy custom JWT for local dev if Entra fails
            verifyLocalCustomJWT(token, req, res, next);
        } else {
            req.userId = decoded.oid || decoded.sub;
            req.userRoles = decoded.roles || []; // RBAC support
            next();
        }
      });
  } else {
      // Legacy custom JWT validation
      verifyLocalCustomJWT(token, req, res, next);
  }
};

function verifyLocalCustomJWT(token: string, req: Request, res: Response, next: NextFunction) {
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRoles = decoded.roles || ['Patient'];
        next();
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
}
