import { Router } from 'express';
import ProductManager from '../managers/ProductManager.js';

const router = Router();
const productManager = new ProductManager();

// GET /api/products - Obtener productos con filtros, paginación y ordenamiento
router.get("/", async (req, res) => {
    try {
        console.log('📥 Parámetros recibidos:', req.query);

        // Extraer y validar parámetros
        const {
            page = 1,
            limit = 10,
            category,
            status,
            minPrice,
            maxPrice,
            search,
            availability,
            sort
        } = req.query;

        // Construir opciones para el manager
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            category,
            status,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            search,
            availability,
            sort
        };

        console.log('⚙️ Opciones procesadas:', options);

        // Obtener productos con el nuevo método
        const result = await productManager.getProducts(options);

        console.log('✅ Resultado obtenido:', {
            productsCount: result.payload.length,
            totalDocs: result.totalDocs,
            page: result.page,
            totalPages: result.totalPages
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Error en GET /api/products:', error);
        res.status(500).json({
            status: "error",
            message: "Error al obtener los productos",
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
            const products = await productManager.getProductsLegacy();
            io.emit('updateProducts', products);
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
            const products = await productManager.getProductsLegacy();
            io.emit('updateProducts', products);
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
            const products = await productManager.getProductsLegacy();
            io.emit('updateProducts', products);
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
                products: await productManager.getProductsLegacy(),
                error: 'Solo los administradores pueden eliminar productos'
            });
        }

        const productId = req.params.pid;
        await productManager.deleteProductById(productId);

        // Emitir WebSocket
        const io = req.app.get('io');
        if (io) {
            const products = await productManager.getProductsLegacy();
            io.emit('updateProducts', products);
        }

        res.render('realTimeProducts', {
            title: 'Productos en Tiempo Real',
            products: await productManager.getProductsLegacy(),
            success: 'Producto eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        const products = await productManager.getProductsLegacy();
        res.render('realTimeProducts', {
            title: 'Productos en Tiempo Real',
            products: products,
            error: `Error al eliminar producto: ${error.message}`
        });
    }
});

export default router;