import express from "express";
import ProductManager from "./src/managers/ProductManager.js";
import CartManager from "./src/managers/CartManager.js";
import { engine } from 'express-handlebars';
import path from 'path';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const productManager = new ProductManager();
const cartManager = new CartManager();

app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(process.cwd(), 'src/views/layouts'),
  viewsDir: path.join(process.cwd(), 'src/views')
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(process.cwd(), 'src/views'));

//Ruta Raiz
app.get('/', async (req, res) => {
  try {
      const products = await productManager.getProducts();
      res.render('home', { 
          title: 'Inicio',
          products: products 
      });
  } catch (error) {
      res.render('home', { 
          title: 'Inicio',
          products: [],
          error: 'Error al cargar productos'
      });
  }
});

// Para realTimeProducts.handlebars
app.get('/realtimeproducts', async (req, res) => {
  try {
      const products = await productManager.getProducts();
      res.render('realTimeProducts', { 
          title: 'Productos en Tiempo Real',
          products: products 
      });
  } catch (error) {
      res.render('realTimeProducts', { 
          title: 'Productos en Tiempo Real',
          products: [],
          error: 'Error al cargar productos'
      });
  }
});

//Productos

//Mostrar todos los productos
app.get("/api/products", async (req, res) => {
    try {
        const products = await productManager.getProducts();
        res.json({ status: "success", products });
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Error al obtener los productos", 
            error: error.message 
        });
    }
});

//Mostrar el producto por ID
app.get("/api/products/:pid", async (req, res) => {
    try {
        const { pid } = req.params;
        const products = await productManager.getProducts();
        const product = products.find(p => p.id === parseInt(pid));
        
        if (!product) {
            return res.status(404).json({ 
                status: "error", 
                message: `Producto con id: ${pid} no encontrado` 
            });
        }
        
        res.json({ status: "success", product });
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Error al obtener el producto", 
            error: error.message 
        });
    }
});

//Agregar nuevo producto
app.post('/api/products', async (req, res) => {
  try {
      const { title, description, price, status, stock, category, thumbnails } = req.body;
      
      // Procesar thumbnails (convertir string separado por comas a array)
      const thumbnailsArray = thumbnails ? 
          thumbnails.split(',').map(url => url.trim()).filter(url => url) : 
          [];
      
      const newProduct = {
          title,
          description,
          price: parseInt(price),
          status: status === 'true',
          stock: parseInt(stock),
          category,
          thumbnails: thumbnailsArray
      };
      
      await productManager.addProduct(newProduct);
      
      // Obtener la lista actualizada y renderizar la misma vista
      const products = await productManager.getProducts();
      res.render('realTimeProducts', { 
          title: 'Productos en Tiempo Real',
          products: products,
          success: 'Producto agregado exitosamente'
      });
      
  } catch (error) {
      // En caso de error, mostrar la vista con mensaje de error
      const products = await productManager.getProducts();
      res.render('realTimeProducts', { 
          title: 'Productos en Tiempo Real',
          products: products,
          error: `Error al agregar producto: ${error.message}`
      });
  }
});

//Actualizar producto
app.put("/api/products/:pid", async (req, res) => {
    try {
        const { pid } = req.params;
        const updatedData = req.body;
        
        // Actualiza todo menos el ID y Code
        if (updatedData.id) {
            delete updatedData.id;
        }
        if (updatedData.code) {
            delete updatedData.code;
        }
        
        const products = await productManager.updateProductById(pid, updatedData);
        res.json({ status: "success", products });
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Error al actualizar el producto", 
            error: error.message 
        });
    }
});

// Eliminar producto usando POST (funciona sin problemas)
app.post('/api/products/:pid/delete', async (req, res) => {
  try {
      const productId = req.params.pid;
      await productManager.deleteProductById(productId);
      
      // Obtener la lista actualizada y renderizar la vista
      const products = await productManager.getProducts();
      res.render('realTimeProducts', { 
          title: 'Productos en Tiempo Real',
          products: products,
          success: 'Producto eliminado exitosamente'
      });
      
  } catch (error) {
      // En caso de error, mostrar la vista con mensaje de error
      const products = await productManager.getProducts();
      res.render('realTimeProducts', { 
          title: 'Productos en Tiempo Real',
          products: products,
          error: `Error al eliminar producto: ${error.message}`
      });
  }
});

// Mantener también la ruta DELETE para APIs externas (si las necesitas)
app.delete('/api/products/:pid', async (req, res) => {
  try {
      const productId = req.params.pid;
      await productManager.deleteProductById(productId);
      
      res.json({
          status: "success",
          message: "Producto eliminado exitosamente"
      });
      
  } catch (error) {
      res.status(500).json({ 
          status: "error", 
          message: "Error al eliminar el producto", 
          error: error.message 
      });
  }
});

//Carrito

//Crea nuevo carrito
app.post("/api/carts", async (req, res) => {
    try {
        const newCart = await cartManager.createCart();
        res.status(201).json({ 
            status: "success", 
            message: "Carrito creado exitosamente",
            cart: newCart 
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Error al crear el carrito", 
            error: error.message 
        });
    }
});

//Muestra productos segun el ID del carrito
app.get("/api/carts/:cid", async (req, res) => {
    try {
        const { cid } = req.params;
        const cart = await cartManager.getCartById(cid);
        
        res.json({ 
            status: "success", 
            cart 
        });
    } catch (error) {
        res.status(404).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

//Agregar un producto al carrito identificado por ID 
app.post("/api/carts/:cid/product/:pid", async (req, res) => {
    try {
        const { cid, pid } = req.params;
        const updatedCart = await cartManager.addProductToCart(cid, pid);
        
        res.json({ 
            status: "success", 
            message: "Producto agregado al carrito exitosamente",
            cart: updatedCart 
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

//Utilizar un puerto
app.listen(8080, () => {
    console.log(`Servidor iniciado en puerto 8080`);
});