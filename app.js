import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { engine } from 'express-handlebars';
import path from 'path';
import dotenv from 'dotenv';

// Importar configuración de base de datos
import connectDB from './src/config/database.js';

// Importar routers
import productsRouter from './src/routes/products.router.js';
import cartsRouter from './src/routes/carts.router.js';
import viewsRouter from './src/routes/views.router.js';

// Importar managers para WebSockets
import ProductManager from "./src/managers/ProductManager.js";

// Configurar variables de entorno
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Conectar a MongoDB Atlas
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Para servir archivos estáticos

// Configuración de Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(process.cwd(), 'src/views/layouts'),
  viewsDir: path.join(process.cwd(), 'src/views')
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(process.cwd(), 'src/views'));

app.set('io', io);

// Configurar rutas
app.use('/', viewsRouter);                    
app.use('/api/products', productsRouter);     
app.use('/api/carts', cartsRouter);           

// CONFIGURACIÓN DE WEBSOCKETS
const productManager = new ProductManager();

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);
    
    // Enviar productos actuales al cliente recién conectado
    productManager.getProducts().then(products => {
        socket.emit('updateProducts', products);
    }).catch(error => {
        console.error('Error al obtener productos:', error);
        socket.emit('error', { message: 'Error al cargar productos' });
    });
    
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
    
    socket.on('addProduct', async (productData) => {
        try {
            const newProduct = await productManager.addProduct(productData);
            const products = await productManager.getProducts();
            io.emit('updateProducts', products);
            socket.emit('productAdded', { success: true, product: newProduct });
        } catch (error) {
            console.error('Error al agregar producto:', error);
            socket.emit('error', { message: error.message });
        }
    });
    
    socket.on('deleteProduct', async (productId) => {
        try {
            await productManager.deleteProductById(productId);
            const products = await productManager.getProducts();
            io.emit('updateProducts', products);
            socket.emit('productDeleted', { success: true, productId });
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            socket.emit('error', { message: error.message });
        }
    });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error global:', error.stack);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
    });
});

// Ruta para manejar 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.originalUrl 
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor con WebSockets iniciado en puerto ${PORT}`);
});