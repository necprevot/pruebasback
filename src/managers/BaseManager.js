class BaseManager {
    constructor(model) {
        this.model = model;
    }

    // Buscar item por ID
    async getById(id) {
        try {
            const item = await this.model.findById(id);
            
            if (!item) {
                throw new Error(`Item con id: ${id} no encontrado`);
            }
            
            return item;
        } catch (error) {
            if (error.name === 'CastError') {
                throw new Error(`ID inválido: ${id}`);
            }
            throw new Error(`Error al obtener el item: ${error.message}`);
        }
    }

    // Obtener todos los items
    async getAll(limit = null, populate = null) {
        try {
            let query = this.model.find();
            
            if (limit) {
                query = query.limit(parseInt(limit));
            }
            
            if (populate) {
                query = query.populate(populate);
            }
            
            const items = await query.exec();
            return items;
        } catch (error) {
            throw new Error(`Error al cargar los datos: ${error.message}`);
        }
    }

    // Eliminar item por ID
    async deleteById(id) {
        try {
            const deletedItem = await this.model.findByIdAndDelete(id);

            if (!deletedItem) {
                throw new Error(`Item con id: ${id} no encontrado`);
            }
            
            return deletedItem;
        } catch (error) {
            if (error.name === 'CastError') {
                throw new Error(`ID inválido: ${id}`);
            }
            throw new Error(`Error al eliminar el item: ${error.message}`);
        }
    }

    // Actualizar item por ID
    async updateById(id, updatedItem) {
        try {
            const updated = await this.model.findByIdAndUpdate(
                id,
                updatedItem,
                { 
                    new: true, 
                    runValidators: true 
                }
            );
            
            if (!updated) {
                throw new Error(`Item con id: ${id} no encontrado`);
            }

            return updated;
        } catch (error) {
            if (error.name === 'CastError') {
                throw new Error(`ID inválido: ${id}`);
            }
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map(err => err.message);
                throw new Error(`Errores de validación: ${errors.join(', ')}`);
            }
            throw new Error(`Error al actualizar el item: ${error.message}`);
        }
    }

    // Agregar nuevo item
    async add(newItemData) {
        try {
            const newItem = new this.model(newItemData);
            await newItem.save();
            return newItem;
        } catch (error) {
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map(err => err.message);
                throw new Error(`Errores de validación: ${errors.join(', ')}`);
            }
            if (error.code === 11000) {
                // Error de duplicado
                const field = Object.keys(error.keyPattern)[0];
                throw new Error(`Ya existe un item con ese ${field}`);
            }
            throw new Error(`Error al agregar el nuevo item: ${error.message}`);
        }
    }

    // Buscar por criterios específicos
    async findBy(criteria, options = {}) {
        try {
            let query = this.model.find(criteria);
            
            if (options.limit) {
                query = query.limit(parseInt(options.limit));
            }
            
            if (options.sort) {
                query = query.sort(options.sort);
            }
            
            if (options.populate) {
                query = query.populate(options.populate);
            }
            
            const items = await query.exec();
            return items;
        } catch (error) {
            throw new Error(`Error en búsqueda: ${error.message}`);
        }
    }

    // Buscar uno por criterios
    async findOneBy(criteria, populate = null) {
        try {
            let query = this.model.findOne(criteria);
            
            if (populate) {
                query = query.populate(populate);
            }
            
            const item = await query.exec();
            return item;
        } catch (error) {
            throw new Error(`Error en búsqueda: ${error.message}`);
        }
    }

    // Contar documentos
    async count(criteria = {}) {
        try {
            const count = await this.model.countDocuments(criteria);
            return count;
        } catch (error) {
            throw new Error(`Error al contar items: ${error.message}`);
        }
    }

    // Verificar si existe
    async exists(criteria) {
        try {
            const item = await this.model.findOne(criteria);
            return !!item;
        } catch (error) {
            throw new Error(`Error al verificar existencia: ${error.message}`);
        }
    }
}

export default BaseManager;