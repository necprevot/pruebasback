import BaseManager from "./BaseManager.js";
import Product from '../models/Product.js';
import QueryService from '../services/QueryService.js';

class ProductManager extends BaseManager {
    constructor() {
        super(Product);
    }

    // Método principal simplificado usando QueryService
    async getProducts(options = {}) {
        try {
            console.log('🔍 getProducts iniciado con:', options);

            // Usar QueryService para simplificar
            const features = new QueryService(this.model, options)
                .filter()
                .search()
                .sort()
                .limitFields()
                .paginate();

            const result = await features.execute();

            // Agregar links de navegación
            result.prevLink = result.hasPrevPage ? this._buildLink(options, result.prevPage) : null;
            result.nextLink = result.hasNextPage ? this._buildLink(options, result.nextPage) : null;

            console.log('✅ Productos obtenidos:', {
                count: result.payload.length,
                totalDocs: result.totalDocs,
                page: result.page
            });

            return result;

        } catch (error) {
            console.error('❌ Error en getProducts:', error);
            throw new Error(`Error al obtener productos: ${error.message}`);
        }
    }

    // Método de búsqueda avanzada simplificado
    async searchProducts(searchTerm, options = {}) {
        try {
            if (!searchTerm || searchTerm.trim().length < 2) {
                return {
                    products: [],
                    suggestions: [],
                    total: 0
                };
            }

            // Usar el método principal con búsqueda
            const searchOptions = { ...options, search: searchTerm };
            const result = await this.getProducts(searchOptions);

            // Generar sugerencias si no hay resultados
            let suggestions = [];
            if (result.payload.length === 0) {
                suggestions = await this._generateSuggestions(searchTerm);
            }

            return {
                products: result.payload,
                suggestions,
                total: result.totalDocs,
                pagination: {
                    page: result.page,
                    totalPages: result.totalPages,
                    hasNextPage: result.hasNextPage,
                    hasPrevPage: result.hasPrevPage
                }
            };

        } catch (error) {
            throw new Error(`Error en búsqueda: ${error.message}`);
        }
    }

    // Construir enlaces de paginación (método simplificado)
    _buildLink(options, page) {
        const params = new URLSearchParams();
        
        // Solo agregar parámetros que tienen valor
        const validParams = {
            page: page !== 1 ? page : null,
            limit: options.limit !== 10 ? options.limit : null,
            sort: options.sort || null,
            category: options.category !== 'all' ? options.category : null,
            search: options.search?.trim() || null,
            availability: options.availability !== 'all' ? options.availability : null,
            minPrice: options.minPrice || null,
            maxPrice: options.maxPrice || null
        };

        Object.entries(validParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.set(key, value.toString());
            }
        });

        const queryString = params.toString();
        return queryString ? `/api/products?${queryString}` : '/api/products';
    }

    // Mantener métodos específicos de negocio
    async getProductStats() {
        try {
            const stats = await this.model.aggregate([
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        activeProducts: { 
                            $sum: { $cond: [{ $eq: ['$status', true] }, 1, 0] } 
                        },
                        inactiveProducts: { 
                            $sum: { $cond: [{ $eq: ['$status', false] }, 1, 0] } 
                        },
                        outOfStock: { 
                            $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } 
                        },
                        lowStock: { 
                            $sum: { $cond: [{ $and: [
                                { $gt: ['$stock', 0] }, 
                                { $lte: ['$stock', 5] }
                            ]}, 1, 0] } 
                        },
                        avgPrice: { $avg: '$price' },
                        minPrice: { $min: '$price' },
                        maxPrice: { $max: '$price' },
                        totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
                    }
                }
            ]);

            return stats[0] || {};
        } catch (error) {
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }
    }

    async getCategories() {
        try {
            const categories = await this.model.distinct('category');
            return categories
                .filter(cat => cat && typeof cat === 'string' && cat.trim())
                .map(cat => cat.trim())
                .sort();
        } catch (error) {
            throw new Error(`Error al obtener categorías: ${error.message}`);
        }
    }

    // Métodos de compatibilidad (mantener para no romper código existente)
    async addProduct(productData) {
        return await this.add(productData);
    }

    async getProductById(id) {
        return await this.getById(id);
    }

    async deleteProductById(id) {
        return await this.deleteById(id);
    }

    async updateProductById(id, updateData) {
        const { _id, code, ...allowedUpdates } = updateData;
        return await this.updateById(id, allowedUpdates);
    }
}

export default ProductManager;