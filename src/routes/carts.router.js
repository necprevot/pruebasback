// src/routes/carts.router.js
import { Router } from 'express';
import CartManager from '../managers/CartManager.js';
import { authenticate, authorize, authorizeCartOwner } from '../middleware/auth.js';

const router = Router();
const cartManager = new CartManager();

console.log('🛒 [Carts Router] Configurando rutas con autorización');

// ====================================
// RUTAS PÚBLICAS
// ====================================

/**
 * POST /api/carts
 * Crear un nuevo carrito vacío
 * Público - No requiere autenticación (para usuarios invitados)
 */
router.post("/", async (req, res) => {
    try {
        console.log('🆕 [Cart] Creando nuevo carrito');
        
        const newCart = await cartManager.createCart();
        
        res.status(201).json({ 
            status: "success", 
            message: "Carrito creado exitosamente",
            cart: newCart 
        });
    } catch (error) {
        console.error('❌ Error creando carrito:', error);
        res.status(500).json({ 
            status: "error", 
            message: "Error al crear el carrito", 
            error: error.message 
        });
    }
});

/**
 * GET /api/carts/:cid
 * Obtener productos de un carrito por ID
 * Público - Permite ver cualquier carrito por ID
 * (útil para compartir carritos o usuarios invitados)
 */
router.get("/:cid", async (req, res) => {
    try {
        const { cid } = req.params;
        console.log('👀 [Cart] Consultando carrito:', cid);
        
        const cart = await cartManager.getCartById(cid);
        
        res.json({ 
            status: "success", 
            cart 
        });
    } catch (error) {
        console.error('❌ Error obteniendo carrito:', error);
        res.status(404).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

/**
 * GET /api/carts/:cid/total
 * Obtener total del carrito
 * Público
 */
router.get("/:cid/total", async (req, res) => {
    try {
        const { cid } = req.params;
        const total = await cartManager.getCartTotal(cid);
        
        res.json({ 
            status: "success", 
            total: total 
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

// ====================================
// RUTAS PROTEGIDAS (USUARIO PROPIETARIO)
// ====================================

/**
 * POST /api/carts/:cid/product/:pid
 * Agregar un producto al carrito
 * REQUIERE: Autenticación + Ser propietario del carrito O admin
 */
router.post("/:cid/product/:pid", 
    authenticate,           // Verificar que está autenticado
    authorizeCartOwner,     // Verificar que es su carrito o es admin
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            console.log('➕ [Cart] Usuario', req.user.email, 'agregando producto', pid, 'al carrito', cid);
            
            const updatedCart = await cartManager.addProductToCart(cid, pid);
            
            res.json({ 
                status: "success", 
                message: "Producto agregado al carrito exitosamente",
                cart: updatedCart 
            });
        } catch (error) {
            console.error('❌ Error agregando producto al carrito:', error);
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

/**
 * DELETE /api/carts/:cid/product/:pid
 * Eliminar un producto específico del carrito
 * REQUIERE: Autenticación + Ser propietario del carrito O admin
 */
router.delete("/:cid/product/:pid", 
    authenticate,
    authorizeCartOwner,
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            console.log('➖ [Cart] Usuario', req.user.email, 'eliminando producto', pid, 'del carrito', cid);
            
            const updatedCart = await cartManager.removeProductFromCart(cid, pid);
            
            res.json({ 
                status: "success", 
                message: "Producto eliminado del carrito exitosamente",
                cart: updatedCart 
            });
        } catch (error) {
            console.error('❌ Error eliminando producto:', error);
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

/**
 * PUT /api/carts/:cid/product/:pid
 * Actualizar cantidad de un producto en el carrito
 * REQUIERE: Autenticación + Ser propietario del carrito O admin
 */
router.put("/:cid/product/:pid", 
    authenticate,
    authorizeCartOwner,
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            const { quantity } = req.body;
            
            if (!quantity || quantity < 0) {
                return res.status(400).json({
                    status: "error",
                    message: "La cantidad debe ser un número positivo"
                });
            }
            
            console.log('🔄 [Cart] Usuario', req.user.email, 'actualizando cantidad de', pid, 'a', quantity);
            
            const updatedCart = await cartManager.updateProductQuantity(cid, pid, parseInt(quantity));
            
            res.json({ 
                status: "success", 
                message: "Cantidad actualizada exitosamente",
                cart: updatedCart 
            });
        } catch (error) {
            console.error('❌ Error actualizando cantidad:', error);
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

/**
 * DELETE /api/carts/:cid
 * Vaciar carrito completo
 * REQUIERE: Autenticación + Ser propietario del carrito O admin
 */
router.delete("/:cid", 
    authenticate,
    authorizeCartOwner,
    async (req, res) => {
        try {
            const { cid } = req.params;
            console.log('🗑️ [Cart] Usuario', req.user.email, 'vaciando carrito', cid);
            
            const clearedCart = await cartManager.clearCart(cid);
            
            res.json({ 
                status: "success", 
                message: "Carrito vaciado exitosamente",
                cart: clearedCart 
            });
        } catch (error) {
            console.error('❌ Error vaciando carrito:', error);
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

/**
 * PUT /api/carts/:cid
 * Actualizar carrito completo (reemplazar todos los productos)
 * REQUIERE: Autenticación + Ser propietario del carrito O admin
 */
router.put("/:cid", 
    authenticate,
    authorizeCartOwner,
    async (req, res) => {
        try {
            const { cid } = req.params;
            const { products } = req.body;
            
            if (!Array.isArray(products)) {
                return res.status(400).json({
                    status: "error",
                    message: "Products debe ser un array"
                });
            }
            
            // Validar formato de productos
            for (const item of products) {
                if (!item.product || !item.quantity || item.quantity < 1) {
                    return res.status(400).json({
                        status: "error",
                        message: "Cada producto debe tener 'product' (ID) y 'quantity' (número positivo)"
                    });
                }
            }
            
            console.log('🔄 [Cart] Usuario', req.user.email, 'actualizando carrito completo', cid);
            
            const cart = await cartManager.getCartById(cid);
            cart.products = products;
            await cart.save();
            
            const updatedCart = await cartManager.getCartById(cid);
            
            res.json({ 
                status: "success", 
                message: "Carrito actualizado exitosamente",
                cart: updatedCart 
            });
        } catch (error) {
            console.error('❌ Error actualizando carrito:', error);
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

// ====================================
// RUTAS ADMINISTRATIVAS (SOLO ADMIN)
// ====================================

/**
 * GET /api/carts
 * Obtener todos los carritos (para admin)
 * REQUIERE: Autenticación + Rol Admin
 */
router.get("/", 
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            console.log('👨‍💼 [Admin] Consultando todos los carritos:', req.user.email);
            
            const carts = await cartManager.getAllCarts();
            res.json({ 
                status: "success", 
                carts 
            });
        } catch (error) {
            console.error('❌ Error obteniendo carritos:', error);
            res.status(500).json({ 
                status: "error", 
                message: "Error al obtener carritos", 
                error: error.message 
            });
        }
    }
);

console.log('✅ [Carts Router] Rutas configuradas con autorización:');
console.log('   📖 POST   /api/carts                    - Público (crear carrito)');
console.log('   📖 GET    /api/carts/:cid               - Público (ver carrito)');
console.log('   📖 GET    /api/carts/:cid/total         - Público (ver total)');
console.log('   🔐 POST   /api/carts/:cid/product/:pid  - Usuario (agregar producto)');
console.log('   🔐 PUT    /api/carts/:cid/product/:pid  - Usuario (actualizar cantidad)');
console.log('   🔐 DELETE /api/carts/:cid/product/:pid  - Usuario (eliminar producto)');
console.log('   🔐 PUT    /api/carts/:cid               - Usuario (actualizar carrito)');
console.log('   🔐 DELETE /api/carts/:cid               - Usuario (vaciar carrito)');
console.log('   👨‍💼 GET    /api/carts                    - Solo Admin (listar todos)');

export default router;