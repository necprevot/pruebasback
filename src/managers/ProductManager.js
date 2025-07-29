import BaseManager from "./BaseManager.js";
import Product from '../models/Product.js';
import QueryService from '../services/QueryService.js';

class ProductManager extends BaseManager {
    constructor() {
        super(Product);
    }

    // Método principal mejorado
    async getProducts(options = {}) {
        try {
            console.log('🔍 getProducts iniciado con opciones:', options);

            // Limpiar y validar opciones
            const cleanOptions = this._cleanOptions(options);
            console.log('🧹 Opciones limpiadas:', cleanOptions);

            // Usar QueryService para procesar la consulta
            const features = new QueryService(this.model, cleanOptions)
                .filter()
                .search()
                .sort()
                .limitFields()
                .paginate();

            const result = await features.execute();

            // Agregar links de navegación
            result.prevLink = result.hasPrevPage ? this._buildLink(cleanOptions, result.prevPage) : null;
            result.nextLink = result.hasNextPage ? this._buildLink(cleanOptions, result.nextPage) : null;

            console.log('✅ Productos obtenidos:', {
                count: result.payload.length,
                totalDocs: result.totalDocs,
                page: result.page,
                totalPages: result.totalPages
            });

            return result;

        } catch (error) {
            console.error('❌ Error en getProducts:', error);
            throw new Error(`Error al obtener productos: ${error.message}`);
        }
    }

    // Limpiar y validar opciones
    _cleanOptions(options) {
        const cleaned = {};

        // Página (siempre >= 1)
        cleaned.page = Math.max(1, parseInt(options.page) || 1);

        // Límite (entre 1 y 100)
        cleaned.limit = Math.max(1, Math.min(100, parseInt(options.limit) || 10));

        // Categoría
        if (options.category && options.category !== 'all' && options.category.trim() !== '') {
            cleaned.category = options.category.trim();
        }

        // Status
        if (options.status !== undefined && options.status !== null) {
            if (options.status === 'true' || options.status === true) {
                cleaned.status = true;
            } else if (options.status === 'false' || options.status === false) {
                cleaned.status = false;
            }
        }

        if (options.availability && options.availability !== 'all') {
            cleaned.availability = options.availability;
        }

        // Precios
        if (options.minPrice !== undefined && options.minPrice !== null && options.minPrice !== '') {
            const minPrice = parseFloat(options.minPrice);
            if (!isNaN(minPrice) && minPrice >= 0) {
                cleaned.minPrice = minPrice;
            }
        }

        if (options.maxPrice !== undefined && options.maxPrice !== null && options.maxPrice !== '') {
            const maxPrice = parseFloat(options.maxPrice);
            if (!isNaN(maxPrice) && maxPrice >= 0) {
                cleaned.maxPrice = maxPrice;
            }
        }

        // Validar que minPrice <= maxPrice
        if (cleaned.minPrice !== undefined && cleaned.maxPrice !== undefined) {
            if (cleaned.minPrice > cleaned.maxPrice) {
                delete cleaned.minPrice;
                delete cleaned.maxPrice;
            }
        }

        // Búsqueda
        if (options.search && typeof options.search === 'string') {
            const searchTerm = options.search.trim();
            if (searchTerm.length >= 2) { 
                cleaned.search = searchTerm;
            }
        }

        // Ordenamiento
        if (options.sort && typeof options.sort === 'string') {
            const validSorts = [
                'price_asc', 'price_desc', 'title_asc', 'title_desc',
                'stock_asc', 'stock_desc', 'newest', 'oldest', 
                'category_asc', 'status_desc'
            ];
            if (validSorts.includes(options.sort)) {
                cleaned.sort = options.sort;
            }
        }

        // Campos específicos
        if (options.fields && typeof options.fields === 'string') {
            cleaned.fields = options.fields;
        }

        return cleaned;
    }

    // Construir enlaces de paginación 
    _buildLink(options, page) {
        const params = new URLSearchParams();
        
        // Solo agregar parámetros que tienen valor válido
        const validParams = {
            page: page && page !== 1 ? page : null,
            limit: options.limit && options.limit !== 10 ? options.limit : null,
            sort: options.sort || null,
            category: options.category || null,
            search: options.search || null,
            availability: options.availability || null,
            minPrice: options.minPrice || null,
            maxPrice: options.maxPrice || null,
            status: options.status !== undefined ? options.status : null
        };

        Object.entries(validParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.set(key, value.toString());
            }
        });

        const queryString = params.toString();
        return queryString ? `/api/products?${queryString}` : '/api/products';
    }

    // Método de búsqueda avanzada simplificado
    async searchProducts(searchTerm, options = {}) {
        try {
            if (!searchTerm || searchTerm.trim().length < 1) {
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

    // Generar sugerencias de búsqueda
    async _generateSuggestions(searchTerm) {
        try {
            // Buscar categorías similares
            const categories = await this.getCategories();
            const categorySuggestions = categories.filter(cat => 
                cat.toLowerCase().includes(searchTerm.toLowerCase())
            );

            // Buscar productos con términos similares 
            const similarProducts = await this.model.find({
                $or: [
                    { title: new RegExp(searchTerm.split('').join('.*'), 'i') },
                    { description: new RegExp(searchTerm.split('').join('.*'), 'i') }
                ]
            }).limit(3).select('title category');

            const suggestions = [
                ...categorySuggestions.map(cat => ({ type: 'category', value: cat })),
                ...similarProducts.map(prod => ({ type: 'product', value: prod.title }))
            ];

            return suggestions.slice(0, 5); 

        } catch (error) {
            console.error('Error generando sugerencias:', error);
            return [];
        }
    }

    // Obtener productos relacionados
    async getRelatedProducts(productId, limit = 4) {
        try {
            const product = await this.getById(productId);
            
            const relatedProducts = await this.model.find({
                _id: { $ne: productId },
                category: product.category,
                status: true
            })
            .limit(limit)
            .select('title price stock thumbnails category status')
            .sort({ createdAt: -1 });

            return relatedProducts;

        } catch (error) {
            console.error('Error obteniendo productos relacionados:', error);
            return [];
        }
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

    // Métodos de compatibilidad 
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