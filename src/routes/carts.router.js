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
// RUTAS PROTEGIDAS - USUARIOS AUTENTICADOS
// ====================================

/**
 * POST /api/carts/:cid/product/:pid
 * Solo usuarios autenticados pueden agregar al carrito
 */
router.post("/:cid/product/:pid",
    authenticate,  // Verificar que esté autenticado
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            
            // Verificar que el usuario sea dueño del carrito
            const userCartId = req.user.cart?.toString();
            if (cid !== userCartId && req.user.role !== 'admin') {
                return res.status(403).json({
                    status: "error",
                    message: "No puedes modificar un carrito que no es tuyo"
                });
            }
            
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
 * Solo usuarios autenticados pueden actualizar cantidad
 */
router.put("/:cid/product/:pid",
    authenticate,
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            const { quantity } = req.body;
            
            // Verificar propiedad del carrito
            const userCartId = req.user.cart?.toString();
            if (cid !== userCartId && req.user.role !== 'admin') {
                return res.status(403).json({
                    status: "error",
                    message: "No autorizado para modificar este carrito"
                });
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
 * Solo usuarios autenticados pueden eliminar productos
 */
router.delete("/:cid/product/:pid",
    authenticate,
    async (req, res) => {
        try {
            const { cid, pid } = req.params;
            
            // Verificar propiedad
            const userCartId = req.user.cart?.toString();
            if (cid !== userCartId && req.user.role !== 'admin') {
                return res.status(403).json({
                    status: "error",
                    message: "No autorizado"
                });
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
 * Solo usuarios autenticados pueden vaciar carrito
 */
router.delete("/:cid",
    authenticate,
    async (req, res) => {
        try {
            const { cid } = req.params;
            
            // Verificar propiedad
            const userCartId = req.user.cart?.toString();
            if (cid !== userCartId && req.user.role !== 'admin') {
                return res.status(403).json({
                    status: "error",
                    message: "No autorizado"
                });
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