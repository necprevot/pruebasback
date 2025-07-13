// src/routes/views.router.js
import { Router } from 'express';
import { ProductsManager } from '../managers/ProductsManager.js';

const router = Router();
const productsManager = new ProductsManager();

// GET / - Página principal con todos los productos
router.get('/', async (req, res) => {
    try {
        const products = await productsManager.getAll();
        res.render('home', { 
            title: 'Productos',
            products,
            hasProducts: products.length > 0
        });
    } catch (error) {
        res.render('home', { 
            title: 'Productos',
            products: [],
            hasProducts: false,
            error: 'Error al cargar productos'
        });
    }
});

// GET /realtimeproducts - Página con productos en tiempo real
router.get('/realtimeproducts', async (req, res) => {
    try {
        const products = await productsManager.getAll();
        res.render('realTimeProducts', { 
            title: 'Productos en Tiempo Real',
            products,
            hasProducts: products.length > 0
        });
    } catch (error) {
        res.render('realTimeProducts', { 
            title: 'Productos en Tiempo Real',
            products: [],
            hasProducts: false,
            error: 'Error al cargar productos'
        });
    }
});

export default router;