// authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import admin from './firebaseAdmin';

export async function checkAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).send('Token manquant');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).send('Token invalide');
  }
}
