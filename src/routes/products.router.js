// src/routes/products.router.js
import { Router } from 'express';
import { ProductsManager } from '../managers/ProductsManager.js';

const router = Router();
const productsManager = new ProductsManager();

// GET /api/products - Obtener todos los productos con paginación
router.get('/', async (req, res) => {
    try {
        const { limit = 10, page = 1, sort, query } = req.query;
        const products = await productsManager.getAll();
        
        let filteredProducts = products;
        
        // Filtrar por query si existe
        if (query) {
            filteredProducts = products.filter(product => 
                product.category?.toLowerCase().includes(query.toLowerCase()) ||
                product.title.toLowerCase().includes(query.toLowerCase())
            );
        }
        
        // Ordenar si se especifica
        if (sort) {
            filteredProducts.sort((a, b) => {
                if (sort === 'asc') return a.price - b.price;
                if (sort === 'desc') return b.price - a.price;
                return 0;
            });
        }
        
        // Paginación
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        const totalPages = Math.ceil(filteredProducts.length / limit);
        const hasPrevPage = page > 1;
        const hasNextPage = page < totalPages;
        
        res.json({
            status: 'success',
            payload: paginatedProducts,
            totalPages,
            prevPage: hasPrevPage ? page - 1 : null,
            nextPage: hasNextPage ? parseInt(page) + 1 : null,
            page: parseInt(page),
            hasPrevPage,
            hasNextPage,
            prevLink: hasPrevPage ? `?page=${page - 1}&limit=${limit}` : null,
            nextLink: hasNextPage ? `?page=${parseInt(page) + 1}&limit=${limit}` : null
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// GET /api/products/:pid - Obtener producto por ID
router.get('/:pid', async (req, res) => {
    try {
        const product = await productsManager.getById(req.params.pid);
        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }
        res.json({ status: 'success', payload: product });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// POST /api/products - Crear nuevo producto
router.post('/', async (req, res) => {
    try {
        const newProduct = await productsManager.create(req.body);
        res.status(201).json({ status: 'success', payload: newProduct });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// PUT /api/products/:pid - Actualizar producto
router.put('/:pid', async (req, res) => {
    try {
        const updatedProduct = await productsManager.update(req.params.pid, req.body);
        if (!updatedProduct) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }
        res.json({ status: 'success', payload: updatedProduct });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// DELETE /api/products/:pid - Eliminar producto
router.delete('/:pid', async (req, res) => {
    try {
        const deletedProduct = await productsManager.delete(req.params.pid);
        if (!deletedProduct) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }
        res.json({ status: 'success', message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

export default router;