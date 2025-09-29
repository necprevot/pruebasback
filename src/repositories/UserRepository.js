import BaseRepository from './BaseRepository.js';
import UserDAO from '../dao/UserDAO.js';
import UserDTO from '../dto/UserDTO.js';
import CurrentUserDTO from '../dto/CurrentUserDTO.js';

/**
 * UserRepository - Implementación del patrón Repository
 * Capa de abstracción entre Service y DAO que maneja DTOs
 */
class UserRepository extends BaseRepository {
    constructor() {
        const userDAO = new UserDAO();
        super(userDAO);
        console.log('📚 [UserRepository] Repository inicializado con DAO');
    }

    /**
     * Crear usuario y retornar DTO
     */
    async createUser(userData) {
        try {
            console.log('📚 [UserRepository] Creando usuario...');
            
            const user = await this.dao.createUser(userData);
            
            // Retornar DTO sin información sensible
            return UserDTO.fromUser(user);
        } catch (error) {
            console.error('❌ [UserRepository] Error creando usuario:', error.message);
            throw error;
        }
    }

    /**
     * Buscar usuario por email (con password para login)
     */
    async findByEmailWithPassword(email) {
        try {
            console.log('📚 [UserRepository] Buscando usuario por email (con password)');
            
            // Para login necesitamos el password
            return await this.dao.findByEmailWithPassword(email);
        } catch (error) {
            console.error('❌ [UserRepository] Error buscando usuario:', error.message);
            throw error;
        }
    }

    /**
     * Buscar usuario por email (sin password)
     */
    async findByEmail(email) {
        try {
            console.log('📚 [UserRepository] Buscando usuario por email');
            
            const user = await this.dao.findByEmail(email);
            
            if (!user) return null;
            
            // Retornar DTO sin información sensible
            return UserDTO.fromUser(user);
        } catch (error) {
            console.error('❌ [UserRepository] Error buscando usuario:', error.message);
            throw error;
        }
    }

    /**
     * Obtener usuario actual para endpoint /current
     * Retorna CurrentUserDTO con información NO sensible
     */
    async getCurrentUser(userId) {
        try {
            console.log('📚 [UserRepository] Obteniendo usuario actual para /current');
            
            const user = await this.dao.findByIdForJWT(userId);
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            // IMPORTANTE: Usar CurrentUserDTO para /current
            // Este DTO contiene solo información NO sensible
            return CurrentUserDTO.fromUser(user);
        } catch (error) {
            console.error('❌ [UserRepository] Error obteniendo usuario actual:', error.message);
            throw error;
        }
    }

    /**
     * Buscar usuario por ID para JWT (sin password)
     */
    async findByIdForJWT(userId) {
        try {
            console.log('📚 [UserRepository] Buscando usuario por ID para JWT');
            
            const user = await this.dao.findByIdForJWT(userId);
            
            // Ya viene sin password del DAO
            return user;
        } catch (error) {
            console.error('❌ [UserRepository] Error buscando usuario para JWT:', error.message);
            throw error;
        }
    }

    /**
     * Actualizar usuario
     */
    async updateUser(userId, updateData) {
        try {
            console.log('📚 [UserRepository] Actualizando usuario');
            
            const user = await this.dao.updateById(userId, updateData);
            
            // Retornar DTO sin información sensible
            return UserDTO.fromUser(user);
        } catch (error) {
            console.error('❌ [UserRepository] Error actualizando usuario:', error.message);
            throw error;
        }
    }

    /**
     * Verificar si usuario existe
     */
    async existsById(userId) {
        try {
            return await this.dao.existsById(userId);
        } catch (error) {
            console.error('❌ [UserRepository] Error verificando existencia:', error.message);
            return false;
        }
    }

    /**
     * Actualizar último login
     */
    async updateLastLogin(userId) {
        try {
            console.log('📚 [UserRepository] Actualizando último login');
            
            return await this.dao.updateLastLogin(userId);
        } catch (error) {
            console.error('❌ [UserRepository] Error actualizando último login:', error.message);
            throw error;
        }
    }

    /**
     * Buscar usuarios por rol (para administración)
     */
    async findByRole(role) {
        try {
            console.log('📚 [UserRepository] Buscando usuarios por rol:', role);
            
            const users = await this.dao.findByRole(role);
            
            // Retornar array de DTOs sin información sensible
            return UserDTO.fromUsers(users);
        } catch (error) {
            console.error('❌ [UserRepository] Error buscando por rol:', error.message);
            throw error;
        }
    }
}

export default UserRepository;