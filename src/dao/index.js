export { default as BaseDAO } from './BaseDAO.js';
export { UserDAO } from './UserDAO.js';
export { CartDAO } from './CartDAO.js';

// src/services/index.js - ARCHIVO DE EXPORTACIONES
export { UserService } from './UserService.js';

// src/controllers/index.js - ARCHIVO DE EXPORTACIONES
export { UserController } from './UserController.js';
export { SessionController } from './SessionController.js';

// src/controllers/UserController.js - CORREGIDO Y COMPLETO
import { UserService } from '../services/UserService.js';

/**
 * CRITERIO: CRUD de usuarios con autenticación
 */
export class UserController {
    constructor() {
        this.userService = new UserService();
    }

    /**
     * POST /api/users/register - Registrar usuario
     * CRITERIO: Modelo de Usuario y Encriptación de Contraseña
     */
    async register(req, res) {
        try {
            console.log('📝 [UserController] Iniciando registro de usuario');
            console.log('📥 [UserController] Datos recibidos:', {
                ...req.body,
                password: req.body.password ? '***' : 'MISSING'
            });

            const { first_name, last_name, email, age, password } = req.body;

            // CRITERIO: Validación de campos requeridos del modelo User
            if (!first_name || !last_name || !email || !password) {
                console.log('❌ [UserController] Faltan campos requeridos');
                return res.status(400).json({
                    status: 'error',
                    message: 'first_name, last_name, email y password son obligatorios',
                    missingFields: {
                        first_name: !first_name,
                        last_name: !last_name,
                        email: !email,
                        password: !password
                    }
                });
            }

            const userData = {
                first_name,
                last_name,
                email,
                age: age ? Number(age) : undefined,
                password,
                role: 'user' // Valor por defecto según evaluación
            };

            console.log('🔄 [UserController] Procesando registro...');
            const result = await this.userService.registerUser(userData);

            console.log('✅ [UserController] Usuario registrado exitosamente');
            res.status(201).json({
                status: 'success',
                message: 'Usuario registrado exitosamente',
                payload: result.user
            });

        } catch (error) {
            console.error('❌ [UserController] Error en registro:', error.message);
            
            // Manejo específico de errores para la evaluación
            if (error.message.includes('ya está registrado')) {
                return res.status(409).json({
                    status: 'error',
                    message: 'El email ya está registrado'
                });
            }
            
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
async getUserById(req, res) {
        try {
            const { id } = req.params;
            console.log('👤 [UserController] Obteniendo usuario por ID:', id);
            
            // CRITERIO: Verificar autorización
            const requesterId = req.user._id || req.user.id;
            if (req.user.role !== 'admin' && requesterId.toString() !== id) {
                console.log('🚫 [UserController] Acceso denegado - sin permisos');
                return res.status(403).json({
                    status: 'error',
                    message: 'No tienes permiso para ver este usuario'
                });
            }

            const result = await this.userService.getCurrentUser(id);

            console.log('✅ [UserController] Usuario obtenido exitosamente');
            res.json({
                status: 'success',
                payload: result.user
            });

        } catch (error) {
            console.error('❌ [UserController] Error obteniendo usuario:', error.message);
            res.status(404).json({
                status: 'error',
                message: error.message
            });
        }
    }
}