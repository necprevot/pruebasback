import { Router } from 'express';
import CartManager from '../managers/CartManager.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();
const cartManager = new CartManager();

// ====================================
// RUTAS PÚBLICAS/MIXTAS
// ====================================

/**
 * POST /api/carts
 * Crear carrito (público para invitados)
 */
router.post("/", async (req, res) => {
    try {
        const newCart = await cartManager.createCart();
        res.status(201).json({ 
            status: "success", 
            message: "Carrito creado",
            cart: newCart 
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

/**
 * GET /api/carts/:cid
 * Ver carrito (público para permitir invitados)
 */
router.get("/:cid", async (req, res) => {
    try {
        const { cid } = req.params;
        const cart = await cartManager.getCartById(cid);
        res.json({ status: "success", cart });
    } catch (error) {
        res.status(404).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

// ====================================
// RUTAS CON AUTENTICACIÓN OPCIONAL
// ====================================

/**
 * POST /api/carts/:cid/product/:pid
 * Agregar producto al carrito
 * NOTA: Cambiado a optionalAuth para permitir invitados Y usuarios autenticados
 */
router.post("/:cid/product/:pid",
    optionalAuth,  // Autenticación opcional
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            
            // Si hay usuario autenticado, verificar que sea su carrito
            if (req.user) {
                const userCartId = req.user.cart?.toString();
                if (cid !== userCartId && req.user.role !== 'admin') {
                    return res.status(403).json({
                        status: "error",
                        message: "No puedes modificar un carrito que no es tuyo"
                    });
                }
            }
            // Si no hay usuario, permitir (invitado)
            
            const updatedCart = await cartManager.addProductToCart(cid, pid);
            
            res.json({ 
                status: "success", 
                message: "Producto agregado al carrito",
                cart: updatedCart 
            });
        } catch (error) {
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

/**
 * PUT /api/carts/:cid/product/:pid
 * Actualizar cantidad (autenticación opcional)
 */
router.put("/:cid/product/:pid",
    optionalAuth,
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            const { quantity } = req.body;
            
            // Si hay usuario autenticado, verificar propiedad
            if (req.user) {
                const userCartId = req.user.cart?.toString();
                if (cid !== userCartId && req.user.role !== 'admin') {
                    return res.status(403).json({
                        status: "error",
                        message: "No autorizado para modificar este carrito"
                    });
                }
            }
            
            if (!quantity || quantity < 0) {
                return res.status(400).json({
                    status: "error",
                    message: "Cantidad inválida"
                });
            }
            
            const updatedCart = await cartManager.updateProductQuantity(
                cid, pid, parseInt(quantity)
            );
            
            res.json({ 
                status: "success", 
                message: "Cantidad actualizada",
                cart: updatedCart 
            });
        } catch (error) {
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

/**
 * DELETE /api/carts/:cid/product/:pid
 * Eliminar producto (autenticación opcional)
 */
router.delete("/:cid/product/:pid",
    optionalAuth,
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            
            // Si hay usuario autenticado, verificar propiedad
            if (req.user) {
                const userCartId = req.user.cart?.toString();
                if (cid !== userCartId && req.user.role !== 'admin') {
                    return res.status(403).json({
                        status: "error",
                        message: "No autorizado"
                    });
                }
            }
            
            const updatedCart = await cartManager.removeProductFromCart(cid, pid);
            
            res.json({ 
                status: "success", 
                message: "Producto eliminado",
                cart: updatedCart 
            });
        } catch (error) {
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

/**
 * DELETE /api/carts/:cid
 * Vaciar carrito (autenticación opcional)
 */
router.delete("/:cid",
    optionalAuth,
    async (req, res) => {
        try {
            const { cid } = req.params;
            
            // Si hay usuario autenticado, verificar propiedad
            if (req.user) {
                const userCartId = req.user.cart?.toString();
                if (cid !== userCartId && req.user.role !== 'admin') {
                    return res.status(403).json({
                        status: "error",
                        message: "No autorizado"
                    });
                }
            }
            
            const clearedCart = await cartManager.clearCart(cid);
            
            res.json({ 
                status: "success", 
                message: "Carrito vaciado",
                cart: clearedCart 
            });
        } catch (error) {
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

// ====================================
// RUTAS ADMINISTRATIVAS
// ====================================

/**
 * GET /api/carts
 * Solo admin puede ver todos los carritos
 */
router.get("/", 
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const carts = await cartManager.getAllCarts();
            res.json({ status: "success", carts });
        } catch (error) {
            res.status(500).json({ 
                status: "error", 
                message: error.message 
            });
        }
    }
);

export default router;