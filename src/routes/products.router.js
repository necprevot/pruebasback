import { Router } from 'express';
import ProductManager from '../managers/ProductManager.js';
import { validateProductQuery } from '../middleware/queryValidation.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission,rolBasedRateLimit } from '../middleware/permissions.js';
import { asyncHandler } from '../utils/CustomErrors.js';

const router = Router();
const productManager = new ProductManager();


// ====================================
// RUTAS PÚBLICAS (NO REQUIEREN AUTH)
// ====================================

/**
 * GET /api/products
 * Obtener lista de productos con paginación y filtros
 * Público - No requiere autenticación
 */
router.get("/", 
    validateProductQuery, 
    optionalAuth,
    // Rate limiting por rol
    rolBasedRateLimit({
        admin: { requests: 1000, window: 60000 },
        premium: { requests: 500, window: 60000 },
        user: { requests: 200, window: 60000 },
        guest: { requests: 50, window: 60000 }
    }),
    // Usar asyncHandler para manejo automático de errores
    asyncHandler(async (req, res) => {

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
    })
);

/**
 * GET /api/products/search
 * Búsqueda avanzada de productos
 * Público - No requiere autenticación
 */
router.get("/search", 
    validateProductQuery, 
    optionalAuth, 
    asyncHandler(async (req, res) => {
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
    })
);

/**
 * GET /api/products/categories
 * Obtener lista de categorías disponibles
 * Público
 */
router.get("/categories", asyncHandler(async (req, res) => {
    const categories = await productManager.getCategories();
    res.json({ status: "success", categories });
}));

/**
 * GET /api/products/stats
 * Obtener estadísticas de productos
 * Usando requireAnyPermission - Admin o Premium pueden ver
 */
router.get("/stats", 
    authenticate,
    requireAnyPermission('analytics:view', 'products:read'),
    asyncHandler(async (req, res) => {
        const stats = await productManager.getProductStats();
        res.json({ status: "success", stats });
    })
);

/**
 * GET /api/products/:pid
 * Obtener un producto por ID
 * Público - No requiere autenticación
 */
router.get("/:pid", asyncHandler(async (req, res) => {
    const { pid } = req.params;
    const product = await productManager.getProductById(pid);
    res.json({ status: "success", product });
}));

// ====================================
// RUTAS PROTEGIDAS (SOLO ADMIN)
// ====================================

/**
 * POST /api/products
 * Crear un nuevo producto
 * Usando requirePermission en lugar de authorize
 * Requiere específicamente el permiso 'products:create'
 */
router.post('/', 
    authenticate,
    requirePermission('products:create'),
    asyncHandler(async (req, res) => {

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
    })
);

/**
 * PUT /api/products/:pid
 * Actualizar un producto existente
 * Con requirePermission
 */
router.put('/:pid', 
    authenticate,
    requirePermission('products:update'),
    asyncHandler(async (req, res) => {
        const { pid } = req.params;

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
    })
);

/**
 * DELETE /api/products/:pid
 * Eliminar un producto
 * Con requirePermission
 */
router.delete('/:pid', 
    authenticate,
    requirePermission('products:delete'),
    asyncHandler(async (req, res) => {
        const { pid } = req.params;

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
    })
);

export default router;