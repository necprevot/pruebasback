
class BaseRepository {
    constructor(dao) {
        if (!dao) {
            throw new Error('DAO es requerido para el Repository');
        }
        this.dao = dao;
    }

    /**
     * Crear un nuevo registro
     */
    async create(data) {
        try {
            return await this.dao.create(data);
        } catch (error) {
            console.error(`[${this.constructor.name}] Error en create:`, error.message);
            throw error;
        }
    }

    /**
     * Buscar por ID
     */
    async findById(id, populate = null) {
        try {
            return await this.dao.findById(id, populate);
        } catch (error) {
            console.error(`[${this.constructor.name}] Error en findById:`, error.message);
            throw error;
        }
    }

    /**
     * Buscar uno por criterios
     */
    async findOne(criteria, populate = null) {
        try {
            return await this.dao.findOne(criteria, populate);
        } catch (error) {
            console.error(`[${this.constructor.name}] Error en findOne:`, error.message);
            throw error;
        }
    }

    /**
     * Buscar múltiples por criterios
     */
    async find(criteria, options = {}) {
        try {
            return await this.dao.findBy(criteria, options);
        } catch (error) {
            console.error(`[${this.constructor.name}] Error en find:`, error.message);
            throw error;
        }
    }

    /**
     * Actualizar por ID
     */
    async updateById(id, updateData) {
        try {
            return await this.dao.updateById(id, updateData);
        } catch (error) {
            console.error(`[${this.constructor.name}] Error en updateById:`, error.message);
            throw error;
        }
    }

    /**
     * Eliminar por ID
     */
    async deleteById(id) {
        try {
            return await this.dao.deleteById(id);
        } catch (error) {
            console.error(`[${this.constructor.name}] Error en deleteById:`, error.message);
            throw error;
        }
    }

    /**
     * Contar registros
     */
    async count(criteria = {}) {
        try {
            return await this.dao.count(criteria);
        } catch (error) {
            console.error(`[${this.constructor.name}] Error en count:`, error.message);
            throw error;
        }
    }

    /**
     * Verificar si existe
     */
    async exists(criteria) {
        try {
            return await this.dao.exists(criteria);
        } catch (error) {
            console.error(`[${this.constructor.name}] Error en exists:`, error.message);
            throw error;
        }
    }
}

export default BaseRepository;