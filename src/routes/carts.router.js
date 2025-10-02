
import { Router } from 'express';
import CartManager from '../managers/CartManager.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const cartManager = new CartManager();


// ====================================
// RUTAS PÚBLICAS (SIN AUTENTICACIÓN)
// ====================================

/**
 * POST /api/carts
 * Crear un nuevo carrito vacío
 */
router.post("/", async (req, res) => {
    try {
        
        const newCart = await cartManager.createCart();
        
        res.status(201).json({ 
            status: "success", 
            message: "Carrito creado exitosamente",
            cart: newCart 
        });
    } catch (error) {
        console.error('Error creando carrito:', error);
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
 */
router.get("/:cid", async (req, res) => {
    try {
        const { cid } = req.params;
        
        const cart = await cartManager.getCartById(cid);
        
        res.json({ 
            status: "success", 
            cart 
        });
    } catch (error) {
        console.error('Error obteniendo carrito:', error);
        res.status(404).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

/**
 * POST /api/carts/:cid/product/:pid
 * Agregar un producto al carrito (SIN AUTENTICACIÓN)
 */
router.post("/:cid/product/:pid", async (req, res) => {
    try {
        const { cid, pid } = req.params;
        
        const updatedCart = await cartManager.addProductToCart(cid, pid);
        
        res.json({ 
            status: "success", 
            message: "Producto agregado al carrito exitosamente",
            cart: updatedCart 
        });
    } catch (error) {
        console.error('Error agregando producto al carrito:', error);
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

/**
 * DELETE /api/carts/:cid/product/:pid
 * Eliminar un producto específico del carrito
 */
router.delete("/:cid/product/:pid", async (req, res) => {
    try {
        const { cid, pid } = req.params;
        
        const updatedCart = await cartManager.removeProductFromCart(cid, pid);
        
        res.json({ 
            status: "success", 
            message: "Producto eliminado del carrito exitosamente",
            cart: updatedCart 
        });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

/**
 * PUT /api/carts/:cid/product/:pid
 * Actualizar cantidad de un producto en el carrito
 */
router.put("/:cid/product/:pid", async (req, res) => {
    try {
        const { cid, pid } = req.params;
        const { quantity } = req.body;
        
        if (!quantity || quantity < 0) {
            return res.status(400).json({
                status: "error",
                message: "La cantidad debe ser un número positivo"
            });
        }
        
        const updatedCart = await cartManager.updateProductQuantity(cid, pid, parseInt(quantity));
        
        res.json({ 
            status: "success", 
            message: "Cantidad actualizada exitosamente",
            cart: updatedCart 
        });
    } catch (error) {
        console.error('Error actualizando cantidad:', error);
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

/**
 * DELETE /api/carts/:cid
 * Vaciar carrito completo
 */
router.delete("/:cid", async (req, res) => {
    try {
        const { cid } = req.params;
        
        const clearedCart = await cartManager.clearCart(cid);
        
        res.json({ 
            status: "success", 
            message: "Carrito vaciado exitosamente",
            cart: clearedCart 
        });
    } catch (error) {
        console.error('Error vaciando carrito:', error);
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

/**
 * GET /api/carts/:cid/total
 * Obtener total del carrito
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
// RUTAS ADMINISTRATIVAS (SOLO ADMIN)
// ====================================

/**
 * GET /api/carts
 * Obtener todos los carritos (para admin)
 */
router.get("/", 
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const carts = await cartManager.getAllCarts();
            res.json({ 
                status: "success", 
                carts 
            });
        } catch (error) {
            console.error('Error obteniendo carritos:', error);
            res.status(500).json({ 
                status: "error", 
                message: "Error al obtener carritos", 
                error: error.message 
            });
        }
    }
);

export default router;