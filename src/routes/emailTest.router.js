import { Router } from 'express';
import EmailService from '../services/EmailService.js';

const router = Router();
const emailService = new EmailService();

// Inicializar servicio al cargar el router
emailService.initialize();

// GET /api/email/test - Verificar estado del servicio
router.get('/test', async (req, res) => {
    try {
        const status = {
            emailEnabled: emailService.isEmailEnabled,
            timestamp: new Date().toISOString(),
            config: {
                hasEmailUser: !!process.env.EMAIL_USER,
                hasEmailPass: !!process.env.EMAIL_PASS,
                service: process.env.EMAIL_SERVICE || 'gmail'
            }
        };

        res.json({
            status: 'success',
            message: 'Servicio de email verificado',
            data: status
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error verificando servicio de email',
            error: error.message
        });
    }
});

// POST /api/email/send-test - Enviar email de prueba
router.post('/send-test', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'Email es requerido'
            });
        }

        const result = await emailService.sendTestEmail(email);

        if (result.success) {
            res.json({
                status: 'success',
                message: 'Email de prueba enviado correctamente',
                data: result
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Error enviando email de prueba',
                error: result.error
            });
        }

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// POST /api/email/welcome - Enviar email de bienvenida (para testing)
router.post('/welcome', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({
                status: 'error',
                message: 'Email y nombre son requeridos'
            });
        }

        const result = await emailService.sendWelcomeEmail(email, name);

        if (result.success) {
            res.json({
                status: 'success',
                message: 'Email de bienvenida enviado',
                data: result
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Error enviando email de bienvenida',
                error: result.error
            });
        }

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

console.log('📧 Router de email test cargado');

export default router;
