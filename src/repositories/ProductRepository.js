
import ProductManager from '../managers/ProductManager.js';

class ProductRepository {
    constructor() {
        this.productManager = new ProductManager();
    }

    /**
     * Obtener productos con filtros y paginación
     */
    async getProducts(options = {}) {
        try {
            return await this.productManager.getProducts(options);
        } catch (error) {
            console.error(' [ProductRepository] Error obteniendo productos:', error.message);
            throw error;
        }
    }

    /**
     * Obtener producto por ID
     */
    async getProductById(productId) {
        try {
            return await this.productManager.getProductById(productId);
        } catch (error) {
            console.error('[ProductRepository] Error obteniendo producto:', error.message);
            throw error;
        }
    }

    /**
     * Crear producto
     */
    async createProduct(productData) {
        try {
            return await this.productManager.addProduct(productData);
        } catch (error) {
            console.error('[ProductRepository] Error creando producto:', error.message);
            throw error;
        }
    }

    /**
     * Actualizar producto
     */
    async updateProduct(productId, updateData) {
        try {
            return await this.productManager.updateProductById(productId, updateData);
        } catch (error) {
            console.error('[ProductRepository] Error actualizando producto:', error.message);
            throw error;
        }
    }

    /**
     * Eliminar producto
     */
    async deleteProduct(productId) {
        try {
            return await this.productManager.deleteProductById(productId);
        } catch (error) {
            console.error('[ProductRepository] Error eliminando producto:', error.message);
            throw error;
        }
    }

    /**
     * Buscar productos
     */
    async searchProducts(searchTerm, options = {}) {
        try {
            return await this.productManager.searchProducts(searchTerm, options);
        } catch (error) {
            console.error('[ProductRepository] Error en búsqueda:', error.message);
            throw error;
        }
    }

    /**
     * Obtener categorías
     */
    async getCategories() {
        try {
            return await this.productManager.getCategories();
        } catch (error) {
            console.error('[ProductRepository] Error obteniendo categorías:', error.message);
            throw error;
        }
    }

    /**
     * Obtener productos relacionados
     */
    async getRelatedProducts(productId, limit = 4) {
        try {
            return await this.productManager.getRelatedProducts(productId, limit);
        } catch (error) {
            console.error('[ProductRepository] Error obteniendo relacionados:', error.message);
            throw error;
        }
    }

    /**
     * Obtener estadísticas
     */
    async getProductStats() {
        try {
            return await this.productManager.getProductStats();
        } catch (error) {
            console.error('[ProductRepository] Error obteniendo estadísticas:', error.message);
            throw error;
        }
    }

    /**
     * Verificar stock disponible
     */
    async checkStock(productId, requestedQuantity) {
        try {
            const product = await this.getProductById(productId);
            
            return {
                available: product.stock >= requestedQuantity,
                stock: product.stock,
                requested: requestedQuantity,
                product: product
            };
        } catch (error) {
            console.error(' [ProductRepository] Error verificando stock:', error.message);
            throw error;
        }
    }

    /**
     * Actualizar stock de múltiples productos (para órdenes)
     */
    async updateStockBatch(updates) {
        try {

            const results = [];
            for (const update of updates) {
                const product = await this.getProductById(update.productId);
                product.stock -= update.quantity;
                await product.save();
                results.push(product);
            }
            
            return results;
        } catch (error) {
            console.error('[ProductRepository] Error actualizando stock:', error.message);
            throw error;
        }
    }
}

export default ProductRepository;