import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { findByEmail } from '../services/UserService.js';
import { authenticate } from '../middleware/auth.js';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h';

// Login - devuelve token
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Email y contraseña son requeridos' 
      });
    }

    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Credenciales inválidas' 
      });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Credenciales inválidas' 
      });
    }

    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Quitar password del objeto user
    const userResponse = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      cart: user.cart
    };

    // Opción 1: Enviar token en cookie (más seguro)
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    // Opción 2: También enviar en la respuesta para el frontend
    res.json({ 
      status: 'success', 
      payload: { 
        token, 
        user: userResponse 
      } 
    });
    
  } catch (err) {
    next(err);
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.json({ 
    status: 'success', 
    message: 'Sesión cerrada correctamente' 
  });
});

// Current user - usa el middleware authenticate
router.get('/current', authenticate, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'No autorizado' 
    });
  }

  const userResponse = {
    _id: req.user._id,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    email: req.user.email,
    role: req.user.role,
    cart: req.user.cart
  };

  res.json({ 
    status: 'success', 
    payload: userResponse 
  });
});

export default router;