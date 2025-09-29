import UserService from '../services/UserService.js'; // AGREGADO: import faltante

class SessionController {
    constructor() {
        this.userService = new UserService();
    }

    async login(req, res) {
        try {
            console.log('🔐 [SessionController] Iniciando proceso de login');
            console.log('📥 [SessionController] Datos recibidos:', {
                email: req.body.email,
                password: req.body.password ? '***' : 'MISSING'
            });

            const { email, password } = req.body;

            // Validación de campos para login
            if (!email || !password) {
                console.log('❌ [SessionController] Faltan credenciales');
                return res.status(400).json({
                    status: 'error',
                    message: 'Email y password son requeridos'
                });
            }

            console.log('🔄 [SessionController] Procesando autenticación...');
            
            // Usar servicio que implementa bcrypt y JWT
            const result = await this.userService.loginUser(email, password);

            console.log('✅ [SessionController] Login exitoso - Token JWT generado');
            
            // Respuesta con token JWT válido
            res.json({
                status: 'success',
                message: 'Login exitoso',
                payload: {
                    token: result.token,
                    user: result.user
                }
            });

        } catch (error) {
            console.error('❌ [SessionController] Error en login:', error.message);
            
            // Manejo de errores de autenticación
            res.status(401).json({
                status: 'error',
                message: 'Credenciales inválidas'
            });
        }
    }

    async logout(req, res) {
        try {
            console.log('🚪 [SessionController] Procesando logout');
            
            res.json({
                status: 'success',
                message: 'Logout exitoso - Por favor elimina el token del cliente'
            });
        } catch (error) {
            console.error('❌ [SessionController] Error en logout:', error.message);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    async current(req, res) {
        try {
            console.log('👤 [SessionController] Procesando /current');
            console.log('🎫 [SessionController] Usuario del JWT:', {
                id: req.user._id,
                email: req.user.email,
                role: req.user.role
            });

            // Verificar que el usuario esté autenticado
            if (!req.user) {
                console.log('❌ [SessionController] No hay usuario en el token');
                return res.status(401).json({
                    status: 'error',
                    message: 'No autorizado - Token inválido o inexistente'
                });
            }

            console.log('✅ [SessionController] Usuario validado correctamente');
            
            // Devolver datos del usuario asociados al JWT
            res.json({
                status: 'success',
                message: 'Usuario validado correctamente',
                payload: req.user
            });

        } catch (error) {
            console.error('❌ [SessionController] Error en /current:', error.message);
            res.status(500).json({
                status: 'error',
                message: 'Error interno del servidor'
            });
        }
    }

    // NUEVO: Solicitar reset de contraseña
    async requestPasswordReset(req, res) {
        try {
            console.log('🔐 [SessionController] Solicitud de reset de contraseña');
            
            const { email } = req.body;
            
            // Validación de email
            if (!email) {
                console.log('❌ [SessionController] Email faltante en request');
                return res.status(400).json({
                    status: 'error',
                    message: 'El email es requerido'
                });
            }
            
            // Validación básica de formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                console.log('❌ [SessionController] Formato de email inválido');
                return res.status(400).json({
                    status: 'error',
                    message: 'Formato de email inválido'
                });
            }
            
            console.log('📧 [SessionController] Procesando solicitud para:', email);
            
            const result = await this.userService.requestPasswordReset(email);
            
            console.log('✅ [SessionController] Solicitud de reset procesada');
            
            // Siempre devolver el mismo mensaje por seguridad
            res.json({
                status: 'success',
                message: 'Si el email existe en nuestro sistema, recibirás un enlace de restablecimiento'
            });
            
        } catch (error) {
            console.error('❌ [SessionController] Error en request password reset:', error.message);
            
            // Por seguridad, devolver siempre el mismo mensaje
            res.json({
                status: 'success',
                message: 'Si el email existe en nuestro sistema, recibirás un enlace de restablecimiento'
            });
        }
    }

    // NUEVO: Resetear contraseña
    async resetPassword(req, res) {
        try {
            console.log('🔄 [SessionController] Reset de contraseña');
            
            const { token, newPassword, confirmPassword } = req.body;
            
            // Validaciones
            if (!token) {
                console.log('❌ [SessionController] Token faltante');
                return res.status(400).json({
                    status: 'error',
                    message: 'Token de restablecimiento requerido'
                });
            }
            
            if (!newPassword) {
                console.log('❌ [SessionController] Nueva contraseña faltante');
                return res.status(400).json({
                    status: 'error',
                    message: 'Nueva contraseña requerida'
                });
            }
            
            if (newPassword.length < 6) {
                console.log('❌ [SessionController] Contraseña muy corta');
                return res.status(400).json({
                    status: 'error',
                    message: 'La contraseña debe tener al menos 6 caracteres'
                });
            }
            
            if (newPassword !== confirmPassword) {
                console.log('❌ [SessionController] Contraseñas no coinciden');
                return res.status(400).json({
                    status: 'error',
                    message: 'Las contraseñas no coinciden'
                });
            }
            
            console.log('🔄 [SessionController] Procesando reset con token válido');
            
            const result = await this.userService.resetPassword(token, newPassword);
            
            console.log('✅ [SessionController] Contraseña restablecida exitosamente');
            
            res.json({
                status: 'success',
                message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
            });
            
        } catch (error) {
            console.error('❌ [SessionController] Error en reset password:', error.message);
            
            if (error.message.includes('inválido') || error.message.includes('expirado')) {
                return res.status(400).json({
                    status: 'error',
                    message: error.message
                });
            }
            
            res.status(500).json({
                status: 'error',
                message: 'Error interno del servidor'
            });
        }
    }

    // NUEVO: Endpoint para pruebas de email
    async sendTestEmail(req, res) {
        try {
            console.log('🧪 [SessionController] Enviando email de prueba');
            
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email requerido para prueba'
                });
            }
            
            const result = await this.userService.sendTestEmail(email);
            
            if (result.success) {
                console.log('✅ [SessionController] Email de prueba enviado');
                res.json({
                    status: 'success',
                    message: 'Email de prueba enviado exitosamente',
                    messageId: result.messageId
                });
            } else {
                console.error('❌ [SessionController] Error enviando email de prueba');
                res.status(500).json({
                    status: 'error',
                    message: 'Error enviando email de prueba: ' + result.error
                });
            }
            
        } catch (error) {
            console.error('❌ [SessionController] Error en test email:', error.message);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
}

export default SessionController;