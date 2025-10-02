import BaseRepository from './BaseRepository.js';
import UserDAO from '../dao/UserDAO.js';
import UserDTO from '../dto/UserDTO.js';
import CurrentUserDTO from '../dto/CurrentUserDTO.js';

class UserRepository extends BaseRepository {
    constructor() {
        const userDAO = new UserDAO();
        super(userDAO);
    }

    /**
     * Crear usuario y retornar DTO
     */
    async createUser(userData) {
        try {
            
            const user = await this.dao.createUser(userData);
            
            // Retornar DTO sin información sensible
            return UserDTO.fromUser(user);
        } catch (error) {
            console.error(' [UserRepository] Error creando usuario:', error.message);
            throw error;
        }
    }

    /**
     * Buscar usuario por email (con password para login)
     */
    async findByEmailWithPassword(email) {
        try {
            
            // Para login necesitamos el password
            return await this.dao.findByEmailWithPassword(email);
        } catch (error) {
            console.error(' [UserRepository] Error buscando usuario:', error.message);
            throw error;
        }
    }

    /**
     * Buscar usuario por email (sin password)
     */
    async findByEmail(email) {
        try {
            
            const user = await this.dao.findByEmail(email);
            
            if (!user) return null;
            
            // Retornar DTO sin información sensible
            return UserDTO.fromUser(user);
        } catch (error) {
            console.error(' [UserRepository] Error buscando usuario:', error.message);
            throw error;
        }
    }

    async getCurrentUser(userId) {
        try {
            
            const user = await this.dao.findByIdForJWT(userId);
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            return CurrentUserDTO.fromUser(user);
        } catch (error) {
            console.error(' [UserRepository] Error obteniendo usuario actual:', error.message);
            throw error;
        }
    }

    /**
     * Buscar usuario por ID para JWT (sin password)
     */
    async findByIdForJWT(userId) {
        try {
 
            const user = await this.dao.findByIdForJWT(userId);
            
            // Ya viene sin password del DAO
            return user;
        } catch (error) {
            console.error(' [UserRepository] Error buscando usuario para JWT:', error.message);
            throw error;
        }
    }

    /**
     * Actualizar usuario
     */
    async updateUser(userId, updateData) {
        try {
            const user = await this.dao.updateById(userId, updateData);
            
            // Retornar DTO sin información sensible
            return UserDTO.fromUser(user);
        } catch (error) {
            console.error(' [UserRepository] Error actualizando usuario:', error.message);
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
            console.error(' [UserRepository] Error verificando existencia:', error.message);
            return false;
        }
    }

    /**
     * Actualizar último login
     */
    async updateLastLogin(userId) {
        try {
            
            return await this.dao.updateLastLogin(userId);
        } catch (error) {
            console.error(' [UserRepository] Error actualizando último login:', error.message);
            throw error;
        }
    }

    /**
     * Buscar usuarios por rol (para administración)
     */
    async findByRole(role) {
        try {
            
            const users = await this.dao.findByRole(role);
            
            // Retornar array de DTOs sin información sensible
            return UserDTO.fromUsers(users);
        } catch (error) {
            console.error(' [UserRepository] Error buscando por rol:', error.message);
            throw error;
        }
    }
}

export default UserRepository;