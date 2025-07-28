import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { engine } from 'express-handlebars';
import path from 'path';
import dotenv from 'dotenv';
import handlebarsHelpers from './src/helpers/index.js';

console.log('🚀 Iniciando aplicación...');

// Configurar variables de entorno ANTES de importar otros módulos
console.log('📁 Cargando variables de entorno...');
dotenv.config();

console.log('🔍 Variables de entorno cargadas:');
console.log('- PORT:', process.env.PORT || 'no definido');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'no definido');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'definido ✅' : 'NO DEFINIDO ❌');

// Importar configuración de base de datos
console.log('📡 Importando configuración de base de datos...');
import connectDB from './src/config/database.js';

// Importar routers
console.log('🛣️ Importando routers...');
import productsRouter from './src/routes/products.router.js';
import cartsRouter from './src/routes/carts.router.js';
import viewsRouter from './src/routes/views.router.js';

// Importar managers para WebSockets
console.log('👨‍💼 Importando managers...');
import ProductManager from "./src/managers/ProductManager.js";

console.log('⚙️ Configurando Express...');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Conectar a MongoDB Atlas
console.log('🔗 Iniciando conexión a MongoDB...');
connectDB().then(() => {
    console.log('✅ Proceso de conexión a MongoDB completado');
}).catch((error) => {
    console.error('💥 Error en proceso de conexión:', error);
});

console.log('🔧 Configurando middlewares...');
// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Para servir archivos estáticos

console.log('🎨 Configurando Handlebars...');
// Configuración de Handlebars
// Fragmento de app.js - Configuración de Handlebars con helpers corregidos
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(process.cwd(), 'src/views/layouts'),
    viewsDir: path.join(process.cwd(), 'src/views'),
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    },
    helpers: handlebarsHelpers
}));


app.set('view engine', 'handlebars');
app.set('views', path.join(process.cwd(), 'src/views'));

app.set('io', io);

console.log('🛣️ Configurando rutas...');
// Configurar rutas
app.use('/', viewsRouter);                    
app.use('/api/products', productsRouter);     
app.use('/api/carts', cartsRouter);           

console.log('🔌 Configurando WebSockets...');
// CONFIGURACIÓN DE WEBSOCKETS
const productManager = new ProductManager();

io.on('connection', (socket) => {
    console.log('👤 Usuario conectado:', socket.id);
    
    // FIX: Enviar solo el array de productos, no el objeto completo
    productManager.getProducts({ limit: 100 }).then(result => {
        console.log('📡 Enviando productos al cliente:', {
            count: result.payload.length,
            total: result.totalDocs,
            isArray: Array.isArray(result.payload)
        });
        
        // CORRECCIÓN: Enviar result.payload (el array), no result
        socket.emit('updateProducts', result.payload);
    }).catch(error => {
        console.error('❌ Error al obtener productos para WebSocket:', error);
        socket.emit('error', { message: 'Error al cargar productos' });
    });
    
    socket.on('disconnect', () => {
        console.log('👋 Usuario desconectado:', socket.id);
    });
    
    // AGREGAR PRODUCTO
    socket.on('addProduct', async (productData) => {
        try {
            console.log('➕ Agregando producto vía WebSocket:', productData);
            const newProduct = await productManager.addProduct(productData);
            
            // FIX: Enviar solo el array de productos
            const result = await productManager.getProducts({ limit: 100 });
            
            // CORRECCIÓN: Enviar result.payload, no result
            io.emit('updateProducts', result.payload);
            socket.emit('productAdded', { success: true, product: newProduct });
            
            console.log('✅ Producto agregado exitosamente:', newProduct._id);
        } catch (error) {
            console.error('❌ Error al agregar producto:', error);
            socket.emit('error', { message: error.message });
        }
    });
    
    // ACTUALIZAR PRODUCTO
    socket.on('updateProduct', async (data) => {
        try {
            const { productId, productData } = data;
            console.log('✏️ Actualizando producto vía WebSocket:', productId, productData);
            
            if (!productId || !productData) {
                throw new Error('ID del producto y datos son requeridos');
            }
            
            const updatedProduct = await productManager.updateProductById(productId, productData);
            
            // FIX: Enviar solo el array de productos
            const result = await productManager.getProducts({ limit: 100 });
            
            // CORRECCIÓN: Enviar result.payload, no result
            io.emit('updateProducts', result.payload);
            socket.emit('productUpdated', { 
                success: true, 
                product: updatedProduct,
                message: 'Producto actualizado exitosamente'
            });
            
            console.log('✅ Producto actualizado exitosamente:', updatedProduct._id);
        } catch (error) {
            console.error('❌ Error al actualizar producto:', error);
            socket.emit('productUpdated', { 
                success: false, 
                message: error.message 
            });
        }
    });
    
    // ELIMINAR PRODUCTO
    socket.on('deleteProduct', async (productId) => {
        try {
            console.log('🗑️ Eliminando producto vía WebSocket:', productId);
            await productManager.deleteProductById(productId);
            
            // FIX: Enviar solo el array de productos
            const result = await productManager.getProducts({ limit: 100 });
            
            // CORRECCIÓN: Enviar result.payload, no result
            io.emit('updateProducts', result.payload);
            socket.emit('productDeleted', { success: true, productId });
            
            console.log('✅ Producto eliminado exitosamente:', productId);
        } catch (error) {
            console.error('❌ Error al eliminar producto:', error);
            socket.emit('error', { message: error.message });
        }
    });
});


console.log('🛡️ Configurando manejo de errores...');
// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('💥 Error global:', error.stack);
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
console.log(`🚢 Iniciando servidor en puerto ${PORT}...`);

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🎉 ¡Servidor con WebSockets iniciado exitosamente!`);
    console.log(`📱 Accede desde: http://localhost:${PORT}`);
    console.log(`🌐 En desarrollo: http://127.0.0.1:${PORT}`);
    console.log('✨ ¡Listo para recibir conexiones!');
});