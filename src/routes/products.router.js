import { Router } from 'express';
import ProductManager from '../managers/ProductManager.js';

const router = Router();
const productManager = new ProductManager();

// GET /api/products - Obtener productos con filtros, paginación y ordenamiento
router.get("/", async (req, res) => {
    try {
        console.log('📥 Parámetros recibidos en GET /api/products:', req.query);

        const {
            limit = 10,
            page = 1,
            sort,
            query
        } = req.query;


        console.log('🎯 Parámetros para ProductManager.getProducts:', {
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            query
        });

        const result = await productManager.getProducts({
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            query
        });

        console.log('✅ Resultado obtenido del manager:', {
            productsCount: result.payload.length,
            totalDocs: result.totalDocs,
            page: result.page,
            totalPages: result.totalPages
        });

        const response = {
            status: "success",
            payload: result.payload,
            totalPages: result.totalPages,
            prevPage: result.prevPage,
            nextPage: result.nextPage,
            page: result.page,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevLink: result.prevLink,
            nextLink: result.nextLink
        };

        console.log('📤 Respuesta formateada:', {
            status: response.status,
            payloadCount: response.payload.length,
            totalPages: response.totalPages,
            page: response.page,
            hasPrevPage: response.hasPrevPage,
            hasNextPage: response.hasNextPage,
            prevLink: response.prevLink,
            nextLink: response.nextLink
        });

        res.json(response);

    } catch (error) {
        console.error('❌ Error en GET /api/products:', error);

        res.status(500).json({
            status: "error",
            payload: [],
            totalPages: 0,
            prevPage: null,
            nextPage: null,
            page: 1,
            hasPrevPage: false,
            hasNextPage: false,
            prevLink: null,
            nextLink: null,
            error: error.message
        });
    }
});

// GET /api/products/search - Búsqueda avanzada
router.get("/search", async (req, res) => {
    try {
        const { q: searchTerm, ...options } = req.query;

        if (!searchTerm) {
            return res.status(400).json({
                status: "error",
                message: "Parámetro de búsqueda 'q' es requerido"
            });
        }

        const result = await productManager.searchProducts(searchTerm, {
            page: parseInt(options.page) || 1,
            limit: parseInt(options.limit) || 10,
            category: options.category,
            status: options.status,
            minPrice: options.minPrice ? parseFloat(options.minPrice) : undefined,
            maxPrice: options.maxPrice ? parseFloat(options.maxPrice) : undefined,
            availability: options.availability,
            sort: options.sort
        });

        res.json({
            status: "success",
            searchTerm,
            ...result
        });

    } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        res.status(500).json({
            status: "error",
            message: "Error en la búsqueda",
            error: error.message
        });
    }
});

// GET /api/products/categories - Obtener categorías disponibles
router.get("/categories", async (req, res) => {
    try {
        const categories = await productManager.getCategories();
        res.json({
            status: "success",
            categories
        });
    } catch (error) {
        console.error('❌ Error obteniendo categorías:', error);
        res.status(500).json({
            status: "error",
            message: "Error al obtener categorías",
            error: error.message
        });
    }
});

// GET /api/products/stats - Obtener estadísticas
router.get("/stats", async (req, res) => {
    try {
        const stats = await productManager.getProductStats();
        res.json({
            status: "success",
            stats
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            status: "error",
            message: "Error al obtener estadísticas",
            error: error.message
        });
    }
});

// GET /api/products/:pid - Obtener producto por ID
router.get("/:pid", async (req, res) => {
    try {
        const { pid } = req.params;
        const product = await productManager.getProductById(pid);

        res.json({
            status: "success",
            product
        });
    } catch (error) {
        console.error('❌ Error obteniendo producto:', error);
        res.status(404).json({
            status: "error",
            message: error.message
        });
    }
});

// GET /api/products/:pid/related - Obtener productos relacionados
router.get("/:pid/related", async (req, res) => {
    try {
        const { pid } = req.params;
        const { limit = 4 } = req.query;

        const relatedProducts = await productManager.getRelatedProducts(pid, parseInt(limit));

        res.json({
            status: "success",
            products: relatedProducts
        });
    } catch (error) {
        console.error('❌ Error obteniendo productos relacionados:', error);
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

// POST /api/products - Crear nuevo producto
router.post('/', async (req, res) => {
    try {
        const isAdmin = req.body.isAdmin === 'true' || req.headers['x-admin-mode'] === 'true';

        if (!isAdmin) {
            return res.status(403).json({
                status: "error",
                message: "Solo los administradores pueden agregar productos"
            });
        }

        const { title, description, price, status, stock, category, thumbnails } = req.body;

        // Procesar thumbnails
        const thumbnailsArray = thumbnails ?
            thumbnails.split(',')
                .map(filename => filename.trim())
                .filter(filename => filename)
                .map(filename => `/img/${filename}`) :
            [];

        const newProduct = {
            title,
            description,
            price: parseFloat(price),
            status: status === 'true',
            stock: parseInt(stock),
            category,
            thumbnails: thumbnailsArray
        };

        const addedProduct = await productManager.addProduct(newProduct);

        // Emitir WebSocket
        const io = req.app.get('io');
        if (io) {
            const result = await productManager.getProducts({
                limit: 100,
                status: undefined
            });
            io.emit('updateProducts', result.payload);
        }

        res.status(201).json({
            status: "success",
            message: "Producto agregado exitosamente",
            product: addedProduct
        });

    } catch (error) {
        console.error('❌ Error creando producto:', error);
        res.status(500).json({
            status: "error",
            message: "Error al agregar producto",
            error: error.message
        });
    }
});

// PUT /api/products/:pid - Actualizar producto
router.put("/:pid", async (req, res) => {
    try {
        const { pid } = req.params;
        const updatedData = req.body;

        console.log('🔄 Actualizando producto vía API:', pid, updatedData);

        const updatedProduct = await productManager.updateProductById(pid, updatedData);

        // Emitir WebSocket
        const io = req.app.get('io');
        if (io) {
            const result = await productManager.getProducts({
                limit: 100,
                status: undefined
            });
            io.emit('updateProducts', result.payload);
            console.log('📡 WebSocket emitido: productos actualizados');
        }

        res.json({
            status: "success",
            message: "Producto actualizado exitosamente",
            product: updatedProduct
        });

        console.log('✅ Producto actualizado vía API:', updatedProduct._id);
    } catch (error) {
        console.error('❌ Error actualizando producto vía API:', error);
        res.status(500).json({
            status: "error",
            message: "Error al actualizar el producto",
            error: error.message
        });
    }
});

// DELETE /api/products/:pid - Eliminar producto
router.delete('/:pid', async (req, res) => {
    try {
        const productId = req.params.pid;
        await productManager.deleteProductById(productId);

        // Emitir WebSocket
        const io = req.app.get('io');
        if (io) {
            const result = await productManager.getProducts({
                limit: 100,
                status: undefined
            });
            io.emit('updateProducts', result.payload);
        }

        res.json({
            status: "success",
            message: "Producto eliminado exitosamente"
        });

    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        res.status(500).json({
            status: "error",
            message: "Error al eliminar el producto",
            error: error.message
        });
    }
});

// POST /api/products/:pid/delete - Eliminar vía POST (para compatibilidad con forms)
router.post('/:pid/delete', async (req, res) => {
    try {
        const isAdmin = req.body.isAdmin === 'true' || req.headers['x-admin-mode'] === 'true';

        if (!isAdmin) {
            return res.status(403).render('realTimeProducts', {
                title: 'Productos en Tiempo Real',
                products: await productManager.getProducts(),
                error: 'Solo los administradores pueden eliminar productos'
            });
        }

        const productId = req.params.pid;
        await productManager.deleteProductById(productId);

        // Emitir WebSocket
        const io = req.app.get('io');
        if (io) {
            const result = await productManager.getProducts({
                limit: 100,
                status: undefined
            });
            io.emit('updateProducts', result.payload);
        }

        res.render('realTimeProducts', {
            title: 'Productos en Tiempo Real',
            products: await productManager.getProducts(),
            success: 'Producto eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        const products = await productManager.getProducts();
        res.render('realTimeProducts', {
            title: 'Productos en Tiempo Real',
            products: products,
            error: `Error al eliminar producto: ${error.message}`
        });
    }
});

router.get("/filters", async (req, res) => {
    try {
        const filtersData = await productManager.getCategories();

        res.json({
            status: "success",
            filters: {
                categories: filtersData,
                availability: [
                    { value: 'available', label: 'Disponibles' },
                    { value: 'outOfStock', label: 'Sin Stock' },
                    { value: 'lowStock', label: 'Stock Bajo' }
                ],
                sortOptions: [
                    { value: 'asc', label: 'Precio: Menor a Mayor' },
                    { value: 'desc', label: 'Precio: Mayor a Menor' }
                ]
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo filtros:', error);
        res.status(500).json({
            status: "error",
            message: "Error al obtener filtros disponibles",
            error: error.message
        });
    }
});

router.get("/test", async (req, res) => {
    try {
        const examples = [
            {
                description: "Básico - defaults",
                url: "/api/products",
                params: {}
            },
            {
                description: "Con límite",
                url: "/api/products?limit=5",
                params: { limit: 5 }
            },
            {
                description: "Página 2",
                url: "/api/products?page=2",
                params: { page: 2 }
            },
            {
                description: "Ordenar por precio ascendente",
                url: "/api/products?sort=asc",
                params: { sort: "asc" }
            },
            {
                description: "Ordenar por precio descendente",
                url: "/api/products?sort=desc",
                params: { sort: "desc" }
            },
            {
                description: "Filtrar productos disponibles",
                url: "/api/products?query=available",
                params: { query: "available" }
            },
            {
                description: "Filtrar productos sin stock",
                url: "/api/products?query=outOfStock",
                params: { query: "outOfStock" }
            },
            {
                description: "Filtrar por categoría",
                url: "/api/products?query=ofertas",
                params: { query: "ofertas" }
            },
            {
                description: "Combinación completa",
                url: "/api/products?limit=3&page=1&sort=desc&query=available",
                params: { limit: 3, page: 1, sort: "desc", query: "available" }
            }
        ];

        res.json({
            status: "success",
            message: "Ejemplos de uso del endpoint GET /api/products",
            examples,
            currentParams: req.query,
            note: "Estos son ejemplos de cómo usar el endpoint principal"
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Error en endpoint de prueba",
            error: error.message
        });
    }
});

export default router;