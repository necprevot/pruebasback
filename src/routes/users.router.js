import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createUser, findByEmail, findById, updateUser, deleteUser } from '../services/UserService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import CartManager from '../managers/CartManager.js';

const router = Router();
const SALT_ROUNDS = 10;
const cartManager = new CartManager();

// Registro
router.post('/register', async (req, res, next) => {
  try {
    const { first_name, last_name, email, age, password } = req.body;

    // Validaciones
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Todos los campos obligatorios deben ser completados' 
      });
    }

    // Verificar si el email ya existe
    const existing = await findByEmail(email);
    if (existing) {
      return res.status(409).json({ 
        status: 'error', 
        message: 'El email ya está registrado' 
      });
    }

    // Crear carrito para el nuevo usuario
    const newCart = await cartManager.createCart();

    // Hash de contraseña
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

    // Crear usuario con carrito
    const userData = {
      first_name,
      last_name,
      email,
      age: age || undefined,
      password: hashedPassword,
      cart: newCart._id,
      role: 'user' // rol por defecto
    };

    const user = await createUser(userData);

    // Respuesta sin contraseña
    const userResponse = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      age: user.age,
      role: user.role,
      cart: user.cart
    };

    res.status(201).json({ 
      status: 'success', 
      payload: userResponse 
    });
    
  } catch (err) {
    console.error('Error en registro:', err);
    next(err);
  }
});

// Obtener usuario por ID (protegido)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // Verificar que el usuario puede acceder a esta información
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'No autorizado para ver esta información' 
      });
    }

    const user = await findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Usuario no encontrado' 
      });
    }

    // Respuesta sin contraseña
    const { password, ...userResponse } = user;
    res.json({ 
      status: 'success', 
      payload: userResponse 
    });
    
  } catch (err) {
    next(err);
  }
});

// Actualizar usuario (solo admin o el mismo usuario)
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'No autorizado' 
      });
    }

    const updateData = { ...req.body };
    
    // Si se actualiza la contraseña, hashearla
    if (updateData.password) {
      updateData.password = bcrypt.hashSync(updateData.password, SALT_ROUNDS);
    }

    const updated = await updateUser(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Usuario no encontrado' 
      });
    }

    // Respuesta sin contraseña
    const { password, ...userResponse } = updated.toObject ? updated.toObject() : updated;
    res.json({ 
      status: 'success', 
      payload: userResponse 
    });
    
  } catch (err) {
    next(err);
  }
});

// Eliminar usuario (solo admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const deleted = await deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({ 
      status: 'success', 
      message: 'Usuario eliminado correctamente' 
    });
    
  } catch (err) {
    next(err);
  }
});

export default router;