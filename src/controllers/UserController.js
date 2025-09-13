import { UserService } from '../services/UserService.js';
import UserService from '../services/UserService.js'; 

/**
 * CRITERIO: CRUD de usuarios con autenticación
 */
class UserController {
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
            console.error('❌ [SessionController] Error en /current:', error.message);
            res.status(500).json({
                status: 'error',
                message: 'Error interno del servidor'
            });
        }
    }
}

export default UserController;