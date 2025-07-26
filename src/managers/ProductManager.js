import BaseManager from "./BaseManager.js";
import Product from '../models/Product.js';

class ProductManager extends BaseManager {
    constructor() {
        super(Product); // Pasar el modelo Product al BaseManager
    }

    // Sobrescribir el método add para mantener tu lógica de addProduct
    async addProduct(productData) {
        try {
            // Validar campos requeridos
            const requiredFields = ['title', 'description', 'price', 'stock', 'category'];
            const missingFields = requiredFields.filter(field => !productData[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Campos faltantes: ${missingFields.join(', ')}`);
            }

            // El código se genera automáticamente en el modelo (pre-save hook)
            // Usar el método heredado de BaseManager
            const newProduct = await this.add(productData);
            return newProduct;
            
        } catch (error) {
            throw new Error(`Error al agregar producto: ${error.message}`);
        }
    }

    // Mantener compatibilidad con tu método original
    async getProducts(limit = null) {
        return await this.getAll(limit);
    }

    // Mantener compatibilidad con tu método original
    async getProductById(id) {
        return await this.getById(id);
    }

    // Mantener compatibilidad con tu método original
    async deleteProductById(id) {
        return await this.deleteById(id);
    }

    // Mantener compatibilidad con tu método original
    async updateProductById(id, updateData) {
        // No permitir actualizar el código
        const { _id, code, ...allowedUpdates } = updateData;
        
        if (code !== undefined) {
            throw new Error('No se puede modificar el código del producto. El código se genera automáticamente y es inmutable.');
        }
        
        return await this.updateById(id, allowedUpdates);
    }

    // Métodos específicos de productos
    async getProductsByCategory(category) {
        try {
            return await this.findBy({ category: new RegExp(category, 'i') });
        } catch (error) {
            throw new Error(`Error al obtener productos por categoría: ${error.message}`);
        }
    }

    async searchProducts(searchTerm) {
        try {
            const searchCriteria = {
                $or: [
                    { title: new RegExp(searchTerm, 'i') },
                    { description: new RegExp(searchTerm, 'i') },
                    { category: new RegExp(searchTerm, 'i') }
                ]
            };
            return await this.findBy(searchCriteria);
        } catch (error) {
            throw new Error(`Error en búsqueda: ${error.message}`);
        }
    }

    async getProductByCode(code) {
        try {
            const product = await this.findOneBy({ code });
            if (!product) {
                throw new Error(`Producto con código ${code} no encontrado`);
            }
            return product;
        } catch (error) {
            throw new Error(`Error al buscar producto por código: ${error.message}`);
        }
    }

    // Verificar stock
    async checkStock(productId, requiredQuantity = 1) {
        try {
            const product = await this.getById(productId);
            return product.stock >= requiredQuantity;
        } catch (error) {
            throw new Error(`Error al verificar stock: ${error.message}`);
        }
    }

    // Actualizar stock
    async updateStock(productId, newStock) {
        try {
            if (newStock < 0) {
                throw new Error('El stock no puede ser negativo');
            }
            return await this.updateById(productId, { stock: newStock });
        } catch (error) {
            throw new Error(`Error al actualizar stock: ${error.message}`);
        }
    }
}

export default ProductManager;