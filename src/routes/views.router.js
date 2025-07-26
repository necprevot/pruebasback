import { Router } from 'express';
import ProductManager from '../managers/ProductManager.js';
import CartManager from '../managers/CartManager.js';

const router = Router();
const productManager = new ProductManager();
const cartManager = new CartManager();

//Ruta Raíz - Home
router.get('/', async (req, res) => {
  try {
      const products = await productManager.getProducts();
      res.render('home', { 
          title: 'Inicio',
          products: products 
      });
  } catch (error) {
      console.error('Error en ruta home:', error);
      res.render('home', { 
          title: 'Inicio',
          products: [],
          error: 'Error al cargar productos: ' + error.message
      });
  }
});

// Ruta para realTimeProducts.handlebars
router.get('/realtimeproducts', async (req, res) => {
  try {
      const products = await productManager.getProducts();
      res.render('realTimeProducts', { 
          title: 'Productos en Tiempo Real',
          products: products 
      });
  } catch (error) {
      console.error('Error en ruta realtimeproducts:', error);
      res.render('realTimeProducts', { 
          title: 'Productos en Tiempo Real',
          products: [],
          error: 'Error al cargar productos: ' + error.message
      });
  }
});

// Ruta para ver un carrito específico
router.get('/carts/:cid', async (req, res) => {
  try {
      const { cid } = req.params;
      const cart = await cartManager.getCartById(cid);
      const total = await cartManager.getCartTotal(cid);
      
      res.render('cart', { 
          title: `Carrito ${cid}`,
          cart: cart,
          cartId: cid,
          total: total,
          hasProducts: cart.products && cart.products.length > 0
      });
  } catch (error) {
      console.error('Error en ruta cart:', error);
      res.render('cart', { 
          title: 'Carrito',
          cart: { products: [] },
          cartId: req.params.cid,
          total: 0,
          hasProducts: false,
          error: error.message
      });
  }
});

export default router;