import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import UserRepository from '../repositories/UserRepository.js';
import CartDAO from '../dao/CartDAO.js';
import emailService from './EmailService.js';

class UserService {
    constructor() {
        // PATRÓN REPOSITORY: Usar Repository en lugar de DAO directo
        this.userRepository = new UserRepository();

        // Para crear carritos usamos DAO directamente
        this.cartDAO = new CartDAO();

        this.saltRounds = 10;
        // Almacenar tokens de reset en memoria (en producción usar Redis o DB)
        this.resetTokens = new Map();

    }

    async registerUser(userData) {
        try {

            // Crear carrito para el usuario
            const cart = await this.cartDAO.createEmptyCart();

            // Encriptar contraseña con bcrypt.hashSync
            const hashedPassword = bcrypt.hashSync(userData.password, this.saltRounds);

            // Preparar datos del usuario con todos los campos requeridos
            const userToCreate = {
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email.toLowerCase(),
                age: userData.age || undefined,
                password: hashedPassword,
                cart: cart._id,
                role: userData.role || 'user'
            };


            // USAR REPOSITORY: Retorna DTO sin información sensible
            const userDTO = await this.userRepository.createUser(userToCreate);


            // Enviar email de bienvenida
            try {


                const emailResult = await emailService.sendWelcomeEmail(
                    userData.email,
                    userData.first_name,
                    userData.last_name
                );

                if (emailResult.success) {

                } else {
                    console.error('[UserService] Error enviando email:', emailResult.message);
                }

            } catch (emailError) {
                console.error('[UserService] Error en envío de email:', emailError.message);
            }

            return {
                status: 'success',
                user: userDTO
            };
        } catch (error) {
            console.error('[UserService] Error en registro:', error.message);
            throw error;
        }
    }

async loginUser(email, password) {
    try {
        console.log('🔐 [UserService] Intentando login para:', email);
        
        const user = await this.userRepository.findByEmailWithPassword(email);
        
        if (!user) {
            throw new Error('Credenciales inválidas');
        }
        
        const isValidPassword = bcrypt.compareSync(password, user.password);
        
        if (!isValidPassword) {
            throw new Error('Credenciales inválidas');
        }
    
        console.log('✅ [UserService] Credenciales válidas para:', user.email);
        
        // 🔧 CONVERTIR CART A STRING SI ES UN OBJETO
        let cartId = null;
        if (user.cart) {
            if (typeof user.cart === 'object' && user.cart._id) {
                cartId = user.cart._id.toString();
            } else {
                cartId = user.cart.toString();
            }
        }
        
        console.log('📦 [UserService] Cart del usuario:', cartId);
        
        const tokenPayload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            cart: cartId // 🔧 INCLUIR CART COMO STRING EN EL TOKEN
        };
        
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'secret_for_dev',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
        
        console.log('🎟️ [UserService] Token generado con cart:', cartId);
        
        try {
            await this.userRepository.updateLastLogin(user._id);
        } catch (updateError) {
            console.log('⚠️ [UserService] No se pudo actualizar último login');
        }
        
        // 🔧 PREPARAR RESPUESTA CON CART COMO STRING
        const { password: _, ...userObj } = user.toObject();
        
        const userResponse = {
            ...userObj,
            cart: cartId // 🔧 ASEGURAR QUE CART SEA STRING
        };
        
        console.log('✅ [UserService] Login exitoso, retornando usuario con cart:', userResponse.cart);
        
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

            // USAR REPOSITORY: Retorna CurrentUserDTO sin información sensible
            const userDTO = await this.userRepository.getCurrentUser(userId);

            return {
                status: 'success',
                user: userDTO // Ya es CurrentUserDTO sin información sensible
            };
        } catch (error) {
            console.error('[UserService] Error obteniendo usuario actual:', error.message);
            throw error;
        }
    }

    async validateUserExists(userId) {
        try {
            return await this.userRepository.existsById(userId);
        } catch (error) {
            console.error('[UserService] Error validando usuario:', error.message);
            return false;
        }
    }

    // Solicitar reset de contraseña
    async requestPasswordReset(email) {
        try {

            // USAR REPOSITORY para buscar usuario
            const userDTO = await this.userRepository.findByEmail(email);

            if (!userDTO) {
                // Por seguridad, no revelamos si el usuario existe o no
                return {
                    success: true,
                    message: 'Si el email existe, recibirás un enlace'
                };
            }

            // Generar token de reset
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = Date.now() + 3600000; // 1 hora

            // Guardar token en memoria (en producción usar DB)
            this.resetTokens.set(resetToken, {
                userId: userDTO._id.toString(),
                email: userDTO.email,
                expiry: tokenExpiry
            });

            // Enviar email con enlace de reset
            const emailResult = await emailService.sendPasswordResetEmail(
                userDTO.email,
                resetToken
            );

            if (emailResult.success) {
            } else {
                console.error('[UserService] Error enviando email de reset:', emailResult.message);
                throw new Error('Error enviando email de recuperación');
            }

            // Limpiar tokens expirados periódicamente
            this.cleanExpiredTokens();

            return {
                success: true,
                message: 'Email de recuperación enviado'
            };

        } catch (error) {
            console.error(' [UserService] Error en request password reset:', error.message);
            throw error;
        }
    }

    // NUEVO: Resetear contraseña
    async resetPassword(token, newPassword) {
        try {

            // Verificar token
            const tokenData = this.resetTokens.get(token);

            if (!tokenData) {
                throw new Error('Token de restablecimiento inválido o expirado');
            }

            // Verificar expiración
            if (Date.now() > tokenData.expiry) {
                this.resetTokens.delete(token);
                throw new Error('Token de restablecimiento expirado. Solicita uno nuevo');
            }


            const user = await this.userRepository.findByEmailWithPassword(tokenData.email);

            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Comparar nueva contraseña con la actual
            const isSamePassword = bcrypt.compareSync(newPassword, user.password);

            if (isSamePassword) {
                throw new Error('La nueva contraseña no puede ser igual a la contraseña actual');
            }

            // Encriptar nueva contraseña
            const hashedPassword = bcrypt.hashSync(newPassword, this.saltRounds);

            // USAR REPOSITORY para actualizar contraseña
            await this.userRepository.updateUser(tokenData.userId, {
                password: hashedPassword
            });

            // Eliminar token usado
            this.resetTokens.delete(token);


            return {
                success: true,
                message: 'Contraseña actualizada exitosamente'
            };

        } catch (error) {
            console.error('[UserService] Error en reset password:', error.message);
            throw error;
        }
    }

    // Limpiar tokens expirados
    cleanExpiredTokens() {
        const now = Date.now();
        for (const [token, data] of this.resetTokens.entries()) {
            if (now > data.expiry) {
                this.resetTokens.delete(token);
            }
        }
    }

    // Reenviar email de bienvenida
    async resendWelcomeEmail(userId) {
        try {

            // USAR REPOSITORY para obtener usuario
            const userDTO = await this.userRepository.getCurrentUser(userId);

            const emailResult = await emailService.sendWelcomeEmail(
                userDTO.email,
                userDTO.first_name,
                userDTO.last_name
            );

            return emailResult;

        } catch (error) {
            console.error('[UserService] Error reenviando email:', error.message);
            return {
                success: false,
                message: 'Error reenviando email: ' + error.message
            };
        }
    }

    async checkEmailConfiguration() {
        try {

            const isConnected = await emailService.verifyConnection();

            return {
                success: isConnected,
                message: isConnected ? 'Configuración de email válida' : 'Error en configuración de email'
            };

        } catch (error) {
            console.error('[UserService] Error verificando email:', error.message);
            return {
                success: false,
                message: 'Error verificando configuración: ' + error.message
            };
        }
    }
}

export default UserService;