import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserDAO from '../dao/UserDAO.js';
import CartDAO from '../dao/CartDAO.js';
import emailService from '../services/EmailService.js';

class UserService {
    constructor() {
        this.userDAO = new UserDAO();
        this.cartDAO = new CartDAO();
        this.saltRounds = 10;
    }

    async registerUser(userData) {
        try {
            console.log('👤 [UserService] Iniciando registro de usuario:', userData.email);
            
            // Crear carrito para el usuario
            const cart = await this.cartDAO.createEmptyCart();
            console.log('🛒 [UserService] Carrito creado para usuario:', cart._id);
            
            // Encriptar contraseña con bcrypt.hashSync
            console.log('🔐 [UserService] Encriptando contraseña con bcrypt.hashSync');
            const hashedPassword = bcrypt.hashSync(userData.password, this.saltRounds);
            console.log('✅ [UserService] Contraseña encriptada correctamente');
            
            // Preparar datos del usuario con todos los campos requeridos
            const userToCreate = {
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email.toLowerCase(),
                age: userData.age || undefined,
                password: hashedPassword, // Password ya hasheado
                cart: cart._id, // Referencia al carrito
                role: userData.role || 'user' // Valor por defecto
            };
            
            console.log('📝 [UserService] Creando usuario con estructura completa');
            const user = await this.userDAO.createUser(userToCreate);
            
            console.log('✅ [UserService] Usuario registrado exitosamente:', user._id);
            
            // NUEVO: Enviar email de bienvenida
            try {
                console.log('📧 [UserService] Enviando email de bienvenida...');
                
                const emailResult = await emailService.sendWelcomeEmail(
                    userData.email,
                    userData.first_name,
                    userData.last_name
                );
                
                if (emailResult.success) {
                    console.log('✅ [UserService] Email de bienvenida enviado exitosamente:', emailResult.messageId);
                } else {
                    console.error('⚠️ [UserService] Error enviando email de bienvenida:', emailResult.message);
                    // No fallar el registro si el email falla
                }
                
            } catch (emailError) {
                console.error('❌ [UserService] Error en envío de email:', emailError.message);
                // No fallar el registro si el email falla
            }
            
            return {
                status: 'success',
                user: user
            };
        } catch (error) {
            console.error('❌ [UserService] Error en registro:', error.message);
            throw error;
        }
    }

    async loginUser(email, password) {
        try {
            console.log('🔐 [UserService] Iniciando login para:', email);
            
            // Buscar usuario con password
            const user = await this.userDAO.findByEmailWithPassword(email);
            if (!user) {
                console.log('❌ [UserService] Usuario no encontrado');
                throw new Error('Credenciales inválidas');
            }
            
            // Verificar contraseña encriptada
            console.log('🔍 [UserService] Verificando contraseña con bcrypt');
            const isValidPassword = bcrypt.compareSync(password, user.password);
            
            if (!isValidPassword) {
                console.log('❌ [UserService] Contraseña inválida');
                throw new Error('Credenciales inválidas');
            }
            
            console.log('✅ [UserService] Contraseña válida, generando JWT');
            
            // Generar token JWT
            const tokenPayload = {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name
            };
            
            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET || 'secret_for_dev',
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );
            
            console.log('✅ [UserService] Token JWT generado exitosamente');
            
            // OPCIONAL: Actualizar último login
            try {
                await this.userDAO.updateLastLogin(user._id);
            } catch (updateError) {
                // No es crítico si falla
                console.log('⚠️ [UserService] No se pudo actualizar último login:', updateError.message);
            }
            
            // Remover password de la respuesta
            const { password: _, ...userResponse } = user.toObject();
            
            return {
                status: 'success',
                token: token,
                user: userResponse
            };
        } catch (error) {
            console.error('❌ [UserService] Error en login:', error.message);
            throw error;
        }
    }

    async getCurrentUser(userId) {
        try {
            console.log('👤 [UserService] Obteniendo usuario actual:', userId);
            
            const user = await this.userDAO.findByIdForJWT(userId);
            
            return {
                status: 'success',
                user: user
            };
        } catch (error) {
            console.error('❌ [UserService] Error obteniendo usuario actual:', error.message);
            throw error;
        }
    }

    async validateUserExists(userId) {
        try {
            return await this.userDAO.existsById(userId);
        } catch (error) {
            console.error('❌ [UserService] Error validando usuario:', error.message);
            return false;
        }
    }

    // NUEVO: Método para reenviar email de bienvenida
    async resendWelcomeEmail(userId) {
        try {
            console.log('📧 [UserService] Reenviando email de bienvenida para usuario:', userId);
            
            const user = await this.userDAO.findByIdForJWT(userId);
            
            const emailResult = await emailService.sendWelcomeEmail(
                user.email,
                user.first_name,
                user.last_name
            );
            
            return emailResult;
            
        } catch (error) {
            console.error('❌ [UserService] Error reenviando email:', error.message);
            return {
                success: false,
                message: 'Error reenviando email: ' + error.message
            };
        }
    }

    async checkEmailConfiguration() {
    try {
        console.log('🔍 [UserService] Verificando configuración de email...');
        
        const isConnected = await emailService.verifyConnection();
        
        return {
            success: isConnected,
            message: isConnected ? 'Configuración de email válida' : 'Error en configuración de email'
        };
        
    } catch (error) {
        console.error('❌ [UserService] Error verificando email:', error.message);
        return {
            success: false,
            message: 'Error verificando configuración: ' + error.message
        };
    }
}
}

export default UserService;