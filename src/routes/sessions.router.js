import { Router } from 'express';
import { SessionController } from '../controllers/SessionController.js';
import passport from "passport";

const router = Router();
const sessionController = new SessionController();

/**
 * CRITERIO: Sistema de Login con JWT
 * CRITERIO: Ruta /current para validación
 */

// POST /api/sessions/login - Login con JWT
router.post('/login', (req, res) => {
    console.log('📍 [Route] POST /api/sessions/login');
    sessionController.login(req, res);
});

// POST /api/sessions/logout - Logout
router.post('/logout', (req, res) => {
    console.log('📍 [Route] POST /api/sessions/logout');
    sessionController.logout(req, res);
});

// CRITERIO: GET /api/sessions/current - Validar usuario logueado
router.get('/current',
    passport.authenticate('current', { session: false }),
    (req, res) => {
        console.log('📍 [Route] GET /api/sessions/current con estrategia "current"');
        sessionController.current(req, res);
    }
);

export default router;