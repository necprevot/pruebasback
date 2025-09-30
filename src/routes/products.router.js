// src/routes/products.router.js
import { Router } from 'express';
import ProductManager from '../managers/ProductManager.js';
import { validateProductQuery } from '../middleware/queryValidation.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();
const productManager = new ProductManager();

console.log('📦 [Products Router] Configurando rutas con autorización');

// ====================================
// RUTAS PÚBLICAS (NO REQUIEREN AUTH)
// ====================================

/**
 * GET /api/products
 * Obtener lista de productos con paginación y filtros
 * Público - No requiere autenticación
 */
router.get("/", validateProductQuery, optionalAuth, async (req, res) => {
    try {
        console.log('📥 GET /api/products con query validado:', req.query);
        
        if (req.user) {
            console.log('👤 Usuario autenticado haciendo consulta:', req.user.email);
        }

        const result = await productManager.getProducts(req.query);

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

/**
 * GET /api/products/search
 * Búsqueda avanzada de productos
 * Público - No requiere autenticación
 */
router.get("/search", validateProductQuery, optionalAuth, async (req, res) => {
    try {
        const { search: searchTerm, ...options } = req.query;

        if (!searchTerm) {
            return res.status(400).json({
                status: "error",
                message: "Parámetro 'search' es requerido"
            });
        }

        const result = await productManager.searchProducts(searchTerm, options);

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

/**
 * GET /api/products/categories
 * Obtener lista de categorías disponibles
 * Público
 */
router.get("/categories", async (req, res) => {
    try {
        const categories = await productManager.getCategories();
        res.json({ status: "success", categories });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

/**
 * GET /api/products/stats
 * Obtener estadísticas de productos
 * Público (opcional: restringir a admin)
 */
router.get("/stats", optionalAuth, async (req, res) => {
    try {
        const stats = await productManager.getProductStats();
        res.json({ status: "success", stats });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

/**
 * GET /api/products/:pid
 * Obtener un producto por ID
 * Público - No requiere autenticación
 */
router.get("/:pid", async (req, res) => {
    try {
        const { pid } = req.params;
        const product = await productManager.getProductById(pid);
        res.json({ status: "success", product });
    } catch (error) {
        res.status(404).json({ status: "error", message: error.message });
    }
});

// ====================================
// RUTAS PROTEGIDAS (SOLO ADMIN)
// ====================================

/**
 * POST /api/products
 * Crear un nuevo producto
 * REQUIERE: Autenticación + Rol Admin
 */
router.post('/', 
    authenticate,           // Verificar que está autenticado
    authorize('admin'),     // Verificar que es admin
    async (req, res) => {
        try {
            console.log('📝 [Admin] Creando nuevo producto:', req.user.email);

            const newProduct = await productManager.addProduct(req.body);

            // Emitir WebSocket para actualizar productos en tiempo real
            const io = req.app.get('io');
            if (io) {
                const result = await productManager.getProducts({ limit: 100 });
                io.emit('updateProducts', result.payload);
            }

            res.status(201).json({
                status: "success",
                message: "Producto agregado exitosamente",
                product: newProduct
            });

        } catch (error) {
            console.error('❌ Error creando producto:', error);
            res.status(500).json({
                status: "error",
                message: "Error al agregar producto",
                error: error.message
            });
        }
    }
);

/**
 * PUT /api/products/:pid
 * Actualizar un producto existente
 * REQUIERE: Autenticación + Rol Admin
 */
router.put('/:pid', 
    authenticate,           // Verificar que está autenticado
    authorize('admin'),     // Verificar que es admin
    async (req, res) => {
        try {
            const { pid } = req.params;
            console.log('📝 [Admin] Actualizando producto:', pid, 'por:', req.user.email);

            const updatedProduct = await productManager.updateProductById(pid, req.body);

            // Emitir WebSocket
            const io = req.app.get('io');
            if (io) {
                const result = await productManager.getProducts({ limit: 100 });
                io.emit('updateProducts', result.payload);
            }

            res.json({
                status: "success",
                message: "Producto actualizado exitosamente",
                product: updatedProduct
            });

        } catch (error) {
            console.error('❌ Error actualizando producto:', error);
            res.status(500).json({
                status: "error",
                message: "Error al actualizar el producto",
                error: error.message
            });
        }
    }
);

/**
 * DELETE /api/products/:pid
 * Eliminar un producto
 * REQUIERE: Autenticación + Rol Admin
 */
router.delete('/:pid', 
    authenticate,           // Verificar que está autenticado
    authorize('admin'),     // Verificar que es admin
    async (req, res) => {
        try {
            const { pid } = req.params;
            console.log('🗑️ [Admin] Eliminando producto:', pid, 'por:', req.user.email);

            await productManager.deleteProductById(pid);

            // Emitir WebSocket
            const io = req.app.get('io');
            if (io) {
                const result = await productManager.getProducts({ limit: 100 });
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
    }
);

console.log('✅ [Products Router] Rutas configuradas con autorización:');
console.log('   📖 GET    /api/products          - Público');
console.log('   📖 GET    /api/products/:pid     - Público');
console.log('   📖 GET    /api/products/search   - Público');
console.log('   🔐 POST   /api/products          - Solo Admin');
console.log('   🔐 PUT    /api/products/:pid     - Solo Admin');
console.log('   🔐 DELETE /api/products/:pid     - Solo Admin');

export default router;