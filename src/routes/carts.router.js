// src/routes/carts.router.js
import { Router } from 'express';
import { CartsManager } from '../managers/CartsManager.js';

const router = Router();
const cartsManager = new CartsManager();

// POST /api/carts - Crear nuevo carrito
router.post('/', async (req, res) => {
    try {
        const newCart = await cartsManager.create();
        res.status(201).json({ status: 'success', payload: newCart });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// GET /api/carts/:cid - Obtener carrito por ID
router.get('/:cid', async (req, res) => {
    try {
        const cart = await cartsManager.getById(req.params.cid);
        if (!cart) {
            return res.status(404).json({ status: 'error', message: 'Cart not found' });
        }
        res.json({ status: 'success', payload: cart });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// POST /api/carts/:cid/product/:pid - Agregar producto al carrito
router.post('/:cid/product/:pid', async (req, res) => {
    try {
        const updatedCart = await cartsManager.addProduct(req.params.cid, req.params.pid);
        res.json({ status: 'success', payload: updatedCart });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// PUT /api/carts/:cid/products/:pid - Actualizar cantidad de producto en carrito
router.put('/:cid/products/:pid', async (req, res) => {
    try {
        const { quantity } = req.body;
        if (!quantity || quantity < 0) {
            return res.status(400).json({ status: 'error', message: 'Valid quantity is required' });
        }
        
        const updatedCart = await cartsManager.updateProductQuantity(req.params.cid, req.params.pid, quantity);
        res.json({ status: 'success', payload: updatedCart });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// DELETE /api/carts/:cid/products/:pid - Eliminar producto del carrito
router.delete('/:cid/products/:pid', async (req, res) => {
    try {
        const updatedCart = await cartsManager.removeProduct(req.params.cid, req.params.pid);
        res.json({ status: 'success', payload: updatedCart });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// DELETE /api/carts/:cid - Vaciar carrito
router.delete('/:cid', async (req, res) => {
    try {
        const updatedCart = await cartsManager.clearCart(req.params.cid);
        res.json({ status: 'success', payload: updatedCart });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

export default router;