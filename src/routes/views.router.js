import { Router } from 'express';
import ProductManager from '../managers/ProductManager.js';
import CartManager from '../managers/CartManager.js';

const router = Router();
const productManager = new ProductManager();
const cartManager = new CartManager();

// Ruta Raíz - Home con filtros y paginación
router.get('/', async (req, res) => {
    try {
        console.log('🏠 Cargando home con parámetros:', req.query);

        // Extraer parámetros de la URL
        const {
            page = 1,
            limit = 12, // Mostrar más productos en la vista principal
            category,
            status = 'true', // Solo productos activos por defecto
            minPrice,
            maxPrice,
            search,
            availability,
            sort = 'status_desc' // Productos activos primero
        } = req.query;

        // Opciones para el manager
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

        // Obtener productos y categorías para los filtros
        const [productsResult, categories, stats] = await Promise.all([
            productManager.getProducts(options),
            productManager.getCategories(),
            productManager.getProductStats()
        ]);

        console.log('📊 Datos obtenidos:', {
            products: productsResult.payload.length,
            categories: categories.length,
            totalDocs: productsResult.totalDocs
        });

        res.render('home', {
            title: 'Inicio',
            products: productsResult.payload,
            pagination: {
                page: productsResult.page,
                totalPages: productsResult.totalPages,
                hasNextPage: productsResult.hasNextPage,
                hasPrevPage: productsResult.hasPrevPage,
                nextPage: productsResult.nextPage,
                prevPage: productsResult.prevPage,
                limit: productsResult.limit,
                totalDocs: productsResult.totalDocs
            },
            filters: {
                categories,
                currentCategory: category || 'all',
                currentStatus: status || 'all',
                currentAvailability: availability || 'all',
                currentSort: sort || 'status_desc',
                minPrice: minPrice || '',
                maxPrice: maxPrice || '',
                search: search || ''
            },
            stats,
            query: req.query // Para mantener filtros en la paginación
        });

    } catch (error) {
        console.error('❌ Error en ruta home:', error);
        res.render('home', {
            title: 'Inicio',
            products: [],
            pagination: {
                page: 1,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
                totalDocs: 0
            },
            filters: {
                categories: [],
                currentCategory: 'all',
                currentStatus: 'all',
                currentAvailability: 'all',
                currentSort: 'status_desc',
                minPrice: '',
                maxPrice: '',
                search: ''
            },
            error: 'Error al cargar productos: ' + error.message
        });
    }
});

// Ruta para realTimeProducts.handlebars con compatibilidad
router.get('/realtimeproducts', async (req, res) => {
    try {
        // Usar el método legacy para mantener compatibilidad con WebSockets
        const products = await productManager.getProductsLegacy();
        
        res.render('realTimeProducts', {
            title: 'Productos en Tiempo Real',
            products: products
        });
    } catch (error) {
        console.error('❌ Error en ruta realtimeproducts:', error);
        res.render('realTimeProducts', {
            title: 'Productos en Tiempo Real',
            products: [],
            error: 'Error al cargar productos: ' + error.message
        });
    }
});

// Ruta de búsqueda
router.get('/search', async (req, res) => {
    try {
        const { q: searchTerm } = req.query;
        
        if (!searchTerm) {
            return res.redirect('/?error=Ingresa un término de búsqueda');
        }

        // Usar los mismos parámetros que la ruta principal
        const {
            page = 1,
            limit = 12,
            category,
            status = 'true',
            minPrice,
            maxPrice,
            availability,
            sort = 'status_desc'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            category,
            status,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            availability,
            sort
        };

        const [searchResult, categories] = await Promise.all([
            productManager.searchProducts(searchTerm, options),
            productManager.getCategories()
        ]);

        res.render('search', {
            title: `Búsqueda: ${searchTerm}`,
            searchTerm,
            products: searchResult.products,
            suggestions: searchResult.suggestions,
            pagination: searchResult.pagination,
            filters: {
                categories,
                currentCategory: category || 'all',
                currentStatus: status || 'all',
                currentAvailability: availability || 'all',
                currentSort: sort || 'status_desc',
                minPrice: minPrice || '',
                maxPrice: maxPrice || '',
                search: searchTerm
            },
            query: req.query,
            totalResults: searchResult.total
        });

    } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        res.render('search', {
            title: 'Error en Búsqueda',
            searchTerm: req.query.q || '',
            products: [],
            suggestions: [],
            pagination: { page: 1, totalPages: 0 },
            error: error.message,
            totalResults: 0
        });
    }
});

// Ruta para ver productos por categoría
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const {
            page = 1,
            limit = 12,
            status = 'true',
            minPrice,
            maxPrice,
            availability,
            sort = 'title_asc'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            category,
            status,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            availability,
            sort
        };

        const [productsResult, categories] = await Promise.all([
            productManager.getProducts(options),
            productManager.getCategories()
        ]);

        res.render('category', {
            title: `Categoría: ${category}`,
            category,
            products: productsResult.payload,
            pagination: {
                page: productsResult.page,
                totalPages: productsResult.totalPages,
                hasNextPage: productsResult.hasNextPage,
                hasPrevPage: productsResult.hasPrevPage,
                nextPage: productsResult.nextPage,
                prevPage: productsResult.prevPage,
                totalDocs: productsResult.totalDocs
            },
            filters: {
                categories,
                currentCategory: category,
                currentStatus: status || 'all',
                currentAvailability: availability || 'all',
                currentSort: sort || 'title_asc',
                minPrice: minPrice || '',
                maxPrice: maxPrice || ''
            },
            query: req.query
        });

    } catch (error) {
        console.error('❌ Error en categoría:', error);
        res.render('category', {
            title: 'Error en Categoría',
            category: req.params.category,
            products: [],
            pagination: { page: 1, totalPages: 0 },
            error: error.message
        });
    }
});

// Ruta para ver un producto específico
router.get('/product/:pid', async (req, res) => {
    try {
        const { pid } = req.params;
        
        const [product, relatedProducts] = await Promise.all([
            productManager.getProductById(pid),
            productManager.getRelatedProducts(pid, 4)
        ]);

        res.render('product', {
            title: product.title,
            product,
            relatedProducts,
            breadcrumb: {
                category: product.category,
                title: product.title
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo producto:', error);
        res.status(404).render('error', {
            title: 'Producto no encontrado',
            status: 404,
            message: error.message,
            url: req.originalUrl
        });
    }
});

// Ruta para ver un carrito específico (mantener la existente)
router.get('/carts/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        console.log('🛒 Obteniendo carrito:', cid);

        const cart = await cartManager.getCartById(cid);
        console.log('📦 Carrito obtenido:', JSON.stringify(cart, null, 2));

        const total = await cartManager.getCartTotal(cid);
        console.log('💰 Total calculado:', total);

        // DEBUGGING ESPECÍFICO PARA PRODUCTOS
        console.log('🔍 Productos en carrito:');
        if (cart.products && Array.isArray(cart.products)) {
            console.log(`- Número de productos: ${cart.products.length}`);
            cart.products.forEach((item, index) => {
                console.log(`- Producto ${index + 1}:`, {
                    id: item.product._id,
                    title: item.product.title,
                    quantity: item.quantity,
                    price: item.product.price
                });
            });

            // Calcular total manual para verificar
            const manualTotal = cart.products.reduce((sum, item) => sum + item.quantity, 0);
            console.log('📊 Total manual de items:', manualTotal);
        } else {
            console.log('❌ No hay productos o products no es un array');
        }

        // SOLUCIÓN: Convertir el documento de Mongoose a objeto plano
        const cartPlain = cart.toObject ? cart.toObject() : cart;
        console.log('🔄 Carrito convertido a objeto plano');

        // Calcular total de items en el servidor
        const totalItems = cartPlain.products ?
            cartPlain.products.reduce((sum, item) => sum + item.quantity, 0) : 0;

        console.log('🎯 Total items calculado en servidor:', totalItems);

        res.render('cart', {
            title: `Carrito ${cid}`,
            cart: cartPlain,  // Usar el objeto plano
            cartId: cid,
            total: total,
            totalItems: totalItems,  // Pasar el total calculado
            hasProducts: cartPlain.products && cartPlain.products.length > 0
        });
    } catch (error) {
        console.error('❌ Error en ruta cart:', error);
        res.render('cart', {
            title: 'Carrito',
            cart: { products: [] },
            cartId: req.params.cid,
            total: 0,
            totalItems: 0,
            hasProducts: false,
            error: error.message
        });
    }
});

// Ruta de administración
router.get('/admin', async (req, res) => {
    try {
        const [stats, categories, recentProducts] = await Promise.all([
            productManager.getProductStats(),
            productManager.getCategories(),
            productManager.getProducts({ 
                page: 1, 
                limit: 10, 
                sort: 'newest' 
            })
        ]);

        res.render('admin', {
            title: 'Panel de Administración',
            stats,
            categories,
            recentProducts: recentProducts.payload
        });

    } catch (error) {
        console.error('❌ Error en panel admin:', error);
        res.render('admin', {
            title: 'Panel de Administración',
            error: error.message
        });
    }
});

export default router;