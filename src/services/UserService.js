import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import UserRepository from '../repositories/UserRepository.js';
import CartDAO from '../dao/CartDAO.js';
import emailService from '../services/EmailService.js';

class UserService {
    constructor() {
        // CAMBIO: Usar Repository en lugar de DAO directo
        this.userRepository = new UserRepository();
        this.cartDAO = new CartDAO();
        this.saltRounds = 10;
        // Almacenar tokens de reset en memoria (en producción usar Redis o DB)
        this.resetTokens = new Map();
        
        console.log('🔧 [UserService] Servicio inicializado con patrón Repository');
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
                password: hashedPassword,
                cart: cart._id,
                role: userData.role || 'user'
            };
            
            console.log('📝 [UserService] Creando usuario con estructura completa');
            const user = await this.userDAO.createUser(userToCreate);
            
            console.log('✅ [UserService] Usuario registrado exitosamente:', user._id);
            
            // Enviar email de bienvenida
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
                }
                
            } catch (emailError) {
                console.error('❌ [UserService] Error en envío de email:', emailError.message);
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
            
            const user = await this.userDAO.findByEmailWithPassword(email);
            if (!user) {
                console.log('❌ [UserService] Usuario no encontrado');
                throw new Error('Credenciales inválidas');
            }
            
            console.log('🔍 [UserService] Verificando contraseña con bcrypt');
            const isValidPassword = bcrypt.compareSync(password, user.password);
            
            if (!isValidPassword) {
                console.log('❌ [UserService] Contraseña inválida');
                throw new Error('Credenciales inválidas');
            }
            
            console.log('✅ [UserService] Contraseña válida, generando JWT');
            
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
            
            try {
                await this.userDAO.updateLastLogin(user._id);
            } catch (updateError) {
                console.log('⚠️ [UserService] No se pudo actualizar último login:', updateError.message);
            }
            
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

    // NUEVO: Solicitar reset de contraseña
    async requestPasswordReset(email) {
        try {
            console.log('🔐 [UserService] Solicitando reset de contraseña para:', email);
            
            // Buscar usuario por email
            const user = await this.userDAO.findByEmail(email);
            
            if (!user) {
                console.log('⚠️ [UserService] Usuario no encontrado, pero no revelamos esto por seguridad');
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
                userId: user._id.toString(),
                email: user.email,
                expiry: tokenExpiry
            });
            
            console.log('🎫 [UserService] Token de reset generado:', resetToken);
            
            // Enviar email con enlace de reset
            const emailResult = await emailService.sendPasswordResetEmail(
                user.email,
                resetToken
            );
            
            if (emailResult.success) {
                console.log('✅ [UserService] Email de reset enviado exitosamente');
            } else {
                console.error('❌ [UserService] Error enviando email de reset:', emailResult.message);
                throw new Error('Error enviando email de recuperación');
            }
            
            // Limpiar tokens expirados periódicamente
            this.cleanExpiredTokens();
            
            return {
                success: true,
                message: 'Email de recuperación enviado'
            };
            
        } catch (error) {
            console.error('❌ [UserService] Error en request password reset:', error.message);
            throw error;
        }
    }

    // NUEVO: Resetear contraseña con token
    async resetPassword(token, newPassword) {
        try {
            console.log('🔄 [UserService] Procesando reset de contraseña con token');
            
            // Verificar token
            const tokenData = this.resetTokens.get(token);
            
            if (!tokenData) {
                console.log('❌ [UserService] Token inválido o no encontrado');
                throw new Error('Token de restablecimiento inválido o expirado');
            }
            
            // Verificar expiración
            if (Date.now() > tokenData.expiry) {
                console.log('❌ [UserService] Token expirado');
                this.resetTokens.delete(token);
                throw new Error('Token de restablecimiento expirado. Solicita uno nuevo');
            }
            
            console.log('✅ [UserService] Token válido, verificando contraseña...');
            
            // NUEVO: Obtener usuario con contraseña actual para comparar
            const user = await this.userDAO.findByEmailWithPassword(tokenData.email);
            
            if (!user) {
                console.log('❌ [UserService] Usuario no encontrado');
                throw new Error('Usuario no encontrado');
            }
            
            // NUEVO: Comparar nueva contraseña con la actual
            const isSamePassword = bcrypt.compareSync(newPassword, user.password);
            
            if (isSamePassword) {
                console.log('❌ [UserService] La nueva contraseña es igual a la actual');
                throw new Error('La nueva contraseña no puede ser igual a la contraseña actual');
            }
            
            console.log('✅ [UserService] Nueva contraseña es diferente, actualizando...');
            
            // Encriptar nueva contraseña
            const hashedPassword = bcrypt.hashSync(newPassword, this.saltRounds);
            
            // Actualizar contraseña en la base de datos
            await this.userDAO.updateById(tokenData.userId, {
                password: hashedPassword
            });
            
            // Eliminar token usado
            this.resetTokens.delete(token);
            
            console.log('✅ [UserService] Contraseña actualizada exitosamente');
            
            return {
                success: true,
                message: 'Contraseña actualizada exitosamente'
            };
            
        } catch (error) {
            console.error('❌ [UserService] Error en reset password:', error.message);
            throw error;
        }
    }

    // Limpiar tokens expirados
    cleanExpiredTokens() {
        const now = Date.now();
        for (const [token, data] of this.resetTokens.entries()) {
            if (now > data.expiry) {
                this.resetTokens.delete(token);
                console.log('🗑️ [UserService] Token expirado eliminado');
            }
        }
    }

    // Reenviar email de bienvenida
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