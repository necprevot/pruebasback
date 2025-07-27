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
// Ruta para ver un carrito específico - CON DEBUGGING
// Ruta para ver un carrito específico - CORREGIDA
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

export default router;