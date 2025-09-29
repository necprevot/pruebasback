import { Router } from 'express';
import SessionController from '../controllers/SessionController.js';
import passport from "passport";

const router = Router();
const sessionController = new SessionController();

console.log('📍 [sessions.router.js] Router de sesiones cargado');
console.log('📍 [sessions.router.js] SessionController instanciado');

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

// POST /api/sessions/forgot-password - Solicitar reset de contraseña
router.post('/forgot-password', (req, res) => {
    console.log('📍 [Route] POST /api/sessions/forgot-password');
    sessionController.requestPasswordReset(req, res);
});

// POST /api/sessions/reset-password - Resetear contraseña con token
router.post('/reset-password', (req, res) => {
    console.log('📍 [Route] POST /api/sessions/reset-password');
    console.log('📥 [Route] Body:', req.body);
    sessionController.resetPassword(req, res);
});

// GET /api/sessions/current - Validar usuario logueado
router.get('/current',
    passport.authenticate('current', { session: false }),
    (req, res) => {
        console.log('📍 [Route] GET /api/sessions/current con estrategia "current"');
        sessionController.current(req, res);
    }
);

// 🧪 ENDPOINT DE PRUEBA PARA EMAIL
router.post('/test-email', async (req, res) => {
    try {
        console.log('🧪 [Route] POST /api/sessions/test-email');
        
        const { email } = req.body;
        const testEmail = email || 'test@example.com';
        
        console.log('📧 [Route] Enviando email de prueba a:', testEmail);
        
        // Import dinámico del EmailService
        const { default: EmailService } = await import('../services/EmailService.js');
        const emailService = new EmailService();
        
        // Verificar configuración primero
        const configResult = await emailService.verifyEmailConfiguration();
        if (!configResult.success) {
            return res.status(500).json({
                status: 'error',
                message: 'Configuración de email incorrecta',
                details: configResult.message
            });
        }
        
        // Enviar email de prueba
        const result = await emailService.sendTestEmail(testEmail);
        
        if (result.success) {
            res.json({
                status: 'success',
                message: 'Email de prueba enviado correctamente',
                messageId: result.messageId,
                sentTo: testEmail,
                configuration: configResult
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Error enviando email de prueba',
                error: result.error,
                configuration: configResult
            });
        }
        
    } catch (error) {
        console.error('❌ [Route] Error en test-email:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// 🔍 ENDPOINT PARA VERIFICAR CONFIGURACIÓN
router.get('/email-config', async (req, res) => {
    try {
        console.log('🔍 [Route] GET /api/sessions/email-config');
        
        // Import dinámico del EmailService
        const { default: EmailService } = await import('../services/EmailService.js');
        const emailService = new EmailService();
        
        const configResult = await emailService.verifyEmailConfiguration();
        
        res.json({
            status: configResult.success ? 'success' : 'error',
            message: configResult.message || 'Configuración verificada',
            configuration: {
                provider: configResult.provider,
                emailUser: configResult.emailUser,
                emailFrom: configResult.emailFrom,
                hasEmailUser: !!process.env.EMAIL_USER,
                hasEmailPassword: !!(process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD),
                websiteUrl: process.env.WEBSITE_URL,
                nodeEnv: process.env.NODE_ENV
            }
        });
        
    } catch (error) {
        console.error('❌ [Route] Error verificando configuración:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Error verificando configuración',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

export default router;