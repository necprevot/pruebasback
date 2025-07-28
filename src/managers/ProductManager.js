import BaseManager from "./BaseManager.js";
import Product from '../models/Product.js';

class ProductManager extends BaseManager {
    constructor() {
        super(Product);
    }

    // Método principal para obtener productos con filtros, paginación y ordenamiento
    async getProducts(options = {}) {
        try {
            const {
                // Paginación
                page = 1,
                limit = 10,
                
                // Filtros
                category,
                status,
                minPrice,
                maxPrice,
                search,
                availability, // 'available', 'outOfStock', 'all'
                
                // Ordenamiento
                sort, // 'price_asc', 'price_desc', 'title_asc', 'title_desc', 'newest', 'oldest'
                
                // Otros
                lean = true // Para mejorar rendimiento
            } = options;

            console.log('🔍 getProducts llamado con opciones:', options);

            // Construir query de filtros
            const query = this._buildQuery({
                category,
                status,
                minPrice,
                maxPrice,
                search,
                availability
            });

            console.log('📋 Query construido:', query);

            // Construir opciones de ordenamiento
            const sortOptions = this._buildSort(sort);

            console.log('📊 Sort options:', sortOptions);

            // Validar parámetros de paginación
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Máximo 100 productos por página
            const skip = (pageNum - 1) * limitNum;

            // Ejecutar consulta con paginación
            const [products, totalDocs] = await Promise.all([
                this.model
                    .find(query)
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(lean),
                this.model.countDocuments(query)
            ]);

            // Calcular información de paginación
            const totalPages = Math.ceil(totalDocs / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            const nextPage = hasNextPage ? pageNum + 1 : null;
            const prevPage = hasPrevPage ? pageNum - 1 : null;

            const result = {
                status: 'success',
                payload: products,
                totalPages,
                prevPage,
                nextPage,
                page: pageNum,
                hasPrevPage,
                hasNextPage,
                prevLink: hasPrevPage ? this._buildLink(options, pageNum - 1) : null,
                nextLink: hasNextPage ? this._buildLink(options, pageNum + 1) : null,
                totalDocs,
                limit: limitNum,
                offset: skip,
                // Información adicional para el frontend
                filters: {
                    category,
                    status,
                    minPrice,
                    maxPrice,
                    search,
                    availability,
                    sort
                }
            };

            console.log('✅ Productos obtenidos:', {
                count: products.length,
                totalDocs,
                page: pageNum,
                totalPages
            });

            return result;

        } catch (error) {
            console.error('❌ Error en getProducts:', error);
            throw new Error(`Error al obtener productos: ${error.message}`);
        }
    }

    // Construir query de filtros
    _buildQuery(filters) {
        const query = {};

        // Filtro por categoría
        if (filters.category && filters.category !== 'all') {
            query.category = new RegExp(filters.category, 'i');
        }

        // Filtro por estado
        if (filters.status !== undefined && filters.status !== 'all') {
            query.status = filters.status === 'true' || filters.status === true;
        }

        // Filtro por rango de precios
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            query.price = {};
            if (filters.minPrice !== undefined && filters.minPrice !== '') {
                query.price.$gte = parseFloat(filters.minPrice);
            }
            if (filters.maxPrice !== undefined && filters.maxPrice !== '') {
                query.price.$lte = parseFloat(filters.maxPrice);
            }
        }

        // Filtro por disponibilidad
        if (filters.availability) {
            switch (filters.availability) {
                case 'available':
                    query.stock = { $gt: 0 };
                    query.status = true;
                    break;
                case 'outOfStock':
                    query.stock = { $lte: 0 };
                    break;
                case 'lowStock':
                    query.stock = { $gt: 0, $lte: 5 };
                    break;
            }
        }

        // Filtro de búsqueda por texto
        if (filters.search && filters.search.trim()) {
            const searchRegex = new RegExp(filters.search.trim(), 'i');
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { category: searchRegex },
                { code: searchRegex }
            ];
        }

        return query;
    }

    // Construir opciones de ordenamiento
    _buildSort(sortOption) {
        const sortOptions = {};

        switch (sortOption) {
            case 'price_asc':
                sortOptions.price = 1;
                break;
            case 'price_desc':
                sortOptions.price = -1;
                break;
            case 'title_asc':
                sortOptions.title = 1;
                break;
            case 'title_desc':
                sortOptions.title = -1;
                break;
            case 'stock_asc':
                sortOptions.stock = 1;
                break;
            case 'stock_desc':
                sortOptions.stock = -1;
                break;
            case 'newest':
                sortOptions.createdAt = -1;
                break;
            case 'oldest':
                sortOptions.createdAt = 1;
                break;
            case 'category_asc':
                sortOptions.category = 1;
                sortOptions.title = 1;
                break;
            case 'status_desc':
                sortOptions.status = -1;
                sortOptions.title = 1;
                break;
            default:
                // Ordenamiento por defecto: productos activos primero, luego por título
                sortOptions.status = -1;
                sortOptions.title = 1;
        }

        return sortOptions;
    }

    // Construir enlaces de paginación
    _buildLink(options, page) {
    const params = new URLSearchParams();
    
    // Agregar página (solo si no es la página 1)
    if (page && page !== 1) {
        params.set('page', page.toString());
    }
    
    // Agregar límite (solo si no es el default de 10)
    if (options.limit && options.limit !== 10) {
        params.set('limit', options.limit.toString());
    }
    
    // Agregar sort (solo si está definido)
    if (options.sort === 'asc' || options.sort === 'desc') {
        params.set('sort', options.sort);
    }
    
    // Agregar query (solo si está definido)
    if (options.query && options.query.trim()) {
        params.set('query', options.query.trim());
    }

    const queryString = params.toString();
    const baseUrl = '/api/products';
    
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

_buildQueryFromConsignaParams(consignaParams) {
    const query = {};
    
    // Procesar parámetro 'query' de la consigna
    if (consignaParams.query && consignaParams.query.trim()) {
        const queryValue = consignaParams.query.trim();
        
        console.log('🔍 Procesando parámetro query:', queryValue);
        
        // OPCIÓN 1: Filtros de disponibilidad específicos
        if (queryValue === 'available') {
            query.stock = { $gt: 0 };
            query.status = true;
            console.log('📦 Filtro aplicado: productos disponibles');
        } 
        else if (queryValue === 'outOfStock') {
            query.stock = { $lte: 0 };
            console.log('📦 Filtro aplicado: productos sin stock');
        }
        else if (queryValue === 'lowStock') {
            query.stock = { $gt: 0, $lte: 5 };
            console.log('📦 Filtro aplicado: productos con stock bajo');
        }
        else if (queryValue === 'inStock') {
            query.stock = { $gt: 0 };
            console.log('📦 Filtro aplicado: productos en stock');
        }
        // OPCIÓN 2: Filtros por estado
        else if (queryValue === 'active') {
            query.status = true;
            console.log('📦 Filtro aplicado: productos activos');
        }
        else if (queryValue === 'inactive') {
            query.status = false;
            console.log('📦 Filtro aplicado: productos inactivos');
        }
        // OPCIÓN 3: Buscar por categoría (caso por defecto)
        else {
            // Buscar tanto en categoría como en título/descripción para mayor flexibilidad
            const searchRegex = new RegExp(queryValue, 'i');
            query.$or = [
                { category: searchRegex },
                { title: searchRegex },
                { description: searchRegex }
            ];
            console.log('📂 Filtro aplicado: búsqueda en categoría/título/descripción:', queryValue);
        }
    }
    
    return query;
}

async getProductsConsigna(consignaParams = {}) {
    try {
        const {
            page = 1,
            limit = 10,
            sort,
            query
        } = consignaParams;

        console.log('🚀 getProductsConsigna iniciado con parámetros:', consignaParams);

        // Validar parámetros de entrada
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        
        console.log('✅ Parámetros validados:', {
            page: pageNum,
            limit: limitNum,
            sort,
            query
        });

        // Construir query de filtros según consigna
        const mongoQuery = this._buildQueryFromConsignaParams({ query });
        console.log('📋 MongoDB Query construido:', JSON.stringify(mongoQuery, null, 2));

        // Construir opciones de ordenamiento según consigna
        let sortOptions = {};
        if (sort === 'asc') {
            sortOptions.price = 1;
            console.log('📊 Ordenamiento: precio ascendente');
        } else if (sort === 'desc') {
            sortOptions.price = -1;
            console.log('📊 Ordenamiento: precio descendente');
        } else {
            // Sin ordenamiento específico, usar orden por defecto
            sortOptions = { status: -1, title: 1 }; // Activos primero, luego por título
            console.log('📊 Ordenamiento por defecto: status desc, title asc');
        }

        const skip = (pageNum - 1) * limitNum;
        console.log('📄 Paginación:', { skip, limit: limitNum });

        // Ejecutar consulta con paginación
        console.log('⏳ Ejecutando consulta a MongoDB...');
        const [products, totalDocs] = await Promise.all([
            this.model
                .find(mongoQuery)
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(true),
            this.model.countDocuments(mongoQuery)
        ]);

        console.log('📊 Resultados de la consulta:', {
            productosEncontrados: products.length,
            totalDocumentos: totalDocs
        });

        // Calcular información de paginación
        const totalPages = Math.ceil(totalDocs / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;
        const nextPage = hasNextPage ? pageNum + 1 : null;
        const prevPage = hasPrevPage ? pageNum - 1 : null;

        // Construir links según consigna
        const baseOptions = { 
            limit: limitNum !== 10 ? limitNum : undefined, // Solo incluir si no es el default
            sort, 
            query 
        };
        
        const prevLink = hasPrevPage ? this._buildLink(baseOptions, prevPage) : null;
        const nextLink = hasNextPage ? this._buildLink(baseOptions, nextPage) : null;

        const result = {
            status: 'success',
            payload: products,
            totalPages,
            prevPage,
            nextPage,
            page: pageNum,
            hasPrevPage,
            hasNextPage,
            prevLink,
            nextLink
        };

        console.log('✅ Respuesta preparada:', {
            status: result.status,
            payloadCount: result.payload.length,
            totalPages: result.totalPages,
            page: result.page,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevLink: result.prevLink,
            nextLink: result.nextLink
        });

        return result;

    } catch (error) {
        console.error('❌ Error en getProductsConsigna:', error);
        throw new Error(`Error al obtener productos según consigna: ${error.message}`);
    }
}

    // Obtener categorías disponibles
   async getCategoriesForConsigna() {
    try {
        const categories = await this.model.distinct('category');
        return {
            categories: categories.filter(cat => cat).sort(),
            availabilityFilters: [
                { value: 'available', label: 'Disponibles' },
                { value: 'outOfStock', label: 'Sin Stock' },
                { value: 'lowStock', label: 'Stock Bajo' },
                { value: 'inStock', label: 'En Stock' },
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' }
            ]
        };
    } catch (error) {
        throw new Error(`Error al obtener categorías: ${error.message}`);
    }
}

    // Obtener estadísticas de productos
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

            return stats[0] || {
                totalProducts: 0,
                activeProducts: 0,
                inactiveProducts: 0,
                outOfStock: 0,
                lowStock: 0,
                avgPrice: 0,
                minPrice: 0,
                maxPrice: 0,
                totalValue: 0
            };
        } catch (error) {
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }
    }

    // Obtener productos relacionados
    async getRelatedProducts(productId, limit = 4) {
        try {
                    const relatedProducts = await this.model
            .find({
                _id: { $ne: productId },
                category: product.category,
                status: true,
                stock: { $gt: 0 } // Solo productos con stock
            })
            .sort({ createdAt: -1 }) // Más recientes primero
            .limit(limit)
            .lean();
        
        // Si no hay suficientes productos de la misma categoría, completar con otros productos
        if (relatedProducts.length < limit) {
            const remainingLimit = limit - relatedProducts.length;
            const relatedIds = relatedProducts.map(p => p._id);
            
            const additionalProducts = await this.model
                .find({
                    _id: { $nin: [productId, ...relatedIds] },
                    status: true,
                    stock: { $gt: 0 }
                })
                .sort({ createdAt: -1 })
                .limit(remainingLimit)
                .lean();
            
            relatedProducts.push(...additionalProducts);
        }
        
        return relatedProducts;
        
        } catch (error) {
            throw new Error(`Error al obtener productos relacionados: ${error.message}`);
        }
    }

    // Búsqueda avanzada con sugerencias
    async searchProducts(searchTerm, options = {}) {
        try {
            if (!searchTerm || searchTerm.trim().length < 2) {
                return {
                    products: [],
                    suggestions: [],
                    total: 0
                };
            }

            const searchOptions = {
                ...options,
                search: searchTerm,
                limit: options.limit || 20
            };

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
            const categories = await this.model.distinct('category');
            const categorySuggestions = categories.filter(cat => 
                cat.toLowerCase().includes(searchTerm.toLowerCase())
            );

            // Buscar títulos similares (primeras 3 palabras)
            const words = searchTerm.toLowerCase().split(' ');
            const titleSuggestions = await this.model
                .find({
                    title: new RegExp(words[0], 'i')
                })
                .select('title')
                .limit(5)
                .lean();

            return [
                ...categorySuggestions.map(cat => ({ type: 'category', value: cat })),
                ...titleSuggestions.map(prod => ({ type: 'product', value: prod.title }))
            ];
        } catch (error) {
            console.error('Error generando sugerencias:', error);
            return [];
        }
    }

    // Mantener métodos existentes para compatibilidad
    async addProduct(productData) {
        try {
            const requiredFields = ['title', 'description', 'price', 'stock', 'category'];
            const missingFields = requiredFields.filter(field => !productData[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Campos faltantes: ${missingFields.join(', ')}`);
            }

            const newProduct = await this.add(productData);
            console.log('Producto agregado:', JSON.stringify(newProduct, null, 2));
            return newProduct;
            
        } catch (error) {
            throw new Error(`Error al agregar producto: ${error.message}`);
        }
    }

    async getProductById(id) {
        return await this.getById(id);
    }

    async deleteProductById(id) {
        return await this.deleteById(id);
    }

    async updateProductById(id, updateData) {
        const { _id, code, ...allowedUpdates } = updateData;
        
        if (code !== undefined) {
            throw new Error('No se puede modificar el código del producto. El código se genera automáticamente y es inmutable.');
        }
        
        return await this.updateById(id, allowedUpdates);
    }

    async getProductsByCategory(category) {
        try {
            return await this.findBy({ category: new RegExp(category, 'i') });
        } catch (error) {
            throw new Error(`Error al obtener productos por categoría: ${error.message}`);
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

    async checkStock(productId, requiredQuantity = 1) {
        try {
            const product = await this.getById(productId);
            return product.stock >= requiredQuantity;
        } catch (error) {
            throw new Error(`Error al verificar stock: ${error.message}`);
        }
    }

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

    // MÉTODOS MOVIDOS DENTRO DE LA CLASE
    async getCategories() {
        try {
            console.log('🔍 ProductManager.getCategories iniciado...');
            const categories = await this.model.distinct('category');
            const cleanCategories = categories
                .filter(cat => cat && typeof cat === 'string' && cat.trim())
                .map(cat => cat.trim())
                .sort();
            
            console.log('✅ Categorías encontradas:', cleanCategories);
            return cleanCategories;
        } catch (error) {
            console.error('❌ Error en ProductManager.getCategories:', error);
            throw new Error(`Error al obtener categorías: ${error.message}`);
        }
    }

    async getProductStatsNew() {
        try {
            console.log('📊 ProductManager.getProductStatsNew iniciado...');
            
            const totalProducts = await this.model.countDocuments();
            const activeProducts = await this.model.countDocuments({ status: true });
            const outOfStock = await this.model.countDocuments({ stock: { $lte: 0 } });
            
            const result = {
                totalProducts,
                activeProducts,
                inactiveProducts: totalProducts - activeProducts,
                outOfStock,
                lowStock: 0,
                avgPrice: 0,
                minPrice: 0,
                maxPrice: 0,
                totalStock: 0,
                totalValue: 0
            };
            
            console.log('✅ Estadísticas calculadas:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Error en ProductManager.getProductStatsNew:', error);
            return {
                totalProducts: 0,
                activeProducts: 0,
                inactiveProducts: 0,
                outOfStock: 0,
                lowStock: 0,
                avgPrice: 0,
                minPrice: 0,
                maxPrice: 0,
                totalStock: 0,
                totalValue: 0
            };
        }
    }

    async debugConnection() {
        try {
            console.log('🔍 Debug de conexión ProductManager...');
            console.log('- Modelo:', this.model.modelName);
            console.log('- Colección:', this.model.collection.name);
            
            const count = await this.model.countDocuments();
            console.log('- Total documentos:', count);
            
            if (count > 0) {
                const sample = await this.model.findOne().lean();
                console.log('- Documento de muestra:', sample);
            }
            
            return { connected: true, count, model: this.model.modelName };
        } catch (error) {
            console.error('❌ Error en debug de conexión:', error);
            return { connected: false, error: error.message };
        }
    }

}

export default ProductManager;