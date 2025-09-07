import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { findByEmail } from '../services/UserService.js';
import passport from 'passport';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '1h';

// Login -> devuelve token
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ status:'error', message:'Faltan email o password' });

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ status:'error', message:'Credenciales inválidas' });

    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.status(401).json({ status:'error', message:'Credenciales inválidas' });

    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // No incluir el password al devolver user
    const { password: _, ...userSafe } = user;

    res.json({ status: 'success', payload: { token, user: userSafe } });
  } catch (err) {
    next(err);
  }
});

// Ruta /current -> usa Passport JWT para extraer usuario
router.get('/current', passport.authenticate('jwt', { session: false }), (req, res) => {
  // passport ya dejó req.user
  const user = req.user;
  if (!user) return res.status(401).json({ status:'error', message:'No autorizado' });

  const { password, ...userSafe } = user;
  res.json({ status: 'success', payload: userSafe });
});

export default router;