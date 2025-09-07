import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createUser, findByEmail, findById, updateUser, deleteUser  } from '../services/UserService.js';
import passport from 'passport';
import { authorize } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10; // puedes ajustar

// Registro
router.post('/register', async (req, res, next) => {
  try {
    const { first_name, last_name, email, age, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'Faltan datos obligatorios' });
    }

    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ status: 'error', message: 'Email ya registrado' });

    // Hash con bcrypt.hashSync (pedido explícito)
    const hashed = bcrypt.hashSync(password, SALT_ROUNDS);

    const user = await createUser({
      first_name,
      last_name,
      email,
      age,
      password: hashed
    });

    // No devolver password
    const { password: _, ...userNoPass } = user.toObject ? user.toObject() : user;
    res.status(201).json({ status: 'success', payload: userNoPass });
  } catch (err) {
    next(err);
  }
});

// Obtener usuario por id (protegido)
router.get('/:id',
  passport.authenticate('jwt',{ session:false }),
  authorize('admin','user'),
  async (req,res,next) => {
    try {
      const user = await findById(req.params.id);
      if (!user) return res.status(404).json({ status:'error', message:'No encontrado' });
      const { password, ...safe } = user;
      res.json({ status:'success', payload: safe });
    } catch (err) { next(err); }
  }
);

// Actualizar usuario (solo admin o el mismo usuario)
router.put('/:id',
  passport.authenticate('jwt',{ session:false }),
  async (req,res,next) => {
    try {
      const requester = req.user;
      if (requester.role !== 'admin' && requester.id !== req.params.id) {
        return res.status(403).json({ status:'error', message:'No autorizado' });
      }

      const body = req.body;
      // Si incluyen password, re-hashear
      if (body.password) {
        body.password = bcrypt.hashSync(body.password, 10);
      }

      const updated = await updateUser(req.params.id, body);
      if (!updated) return res.status(404).json({ status:'error', message:'No encontrado' });
      const { password, ...safe } = updated.toObject ? updated.toObject() : updated;
      res.json({ status:'success', payload: safe });
    } catch (err) { next(err); }
  }
);

// Borrar usuario (solo admin)
router.delete('/:id',
  passport.authenticate('jwt',{ session:false }),
  authorize('admin'),
  async (req,res,next) => {
    try {
      const deleted = await deleteUser(req.params.id);
      if (!deleted) return res.status(404).json({ status:'error', message:'No encontrado' });
      res.json({ status:'success', message:'Usuario eliminado' });
    } catch (err) { next(err); }
  }
);

export default router;