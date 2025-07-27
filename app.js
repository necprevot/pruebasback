import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { engine } from 'express-handlebars';
import path from 'path';
import dotenv from 'dotenv';

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
    // SOLUCIÓN: Configuración de runtime para permitir acceso a propiedades
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    },
    helpers: {
        // Helper para multiplicar (precio * cantidad)
        multiply: function(a, b) {
            return a * b;
        },
        // Helper para obtener total de items - CORREGIDO
        getTotalItems: function(products) {
            console.log('🔢 getTotalItems helper called with:', products);
            
            // Verificar si products existe y es un array
            if (!products) {
                console.log('❌ Products is null or undefined');
                return 0;
            }
            
            if (!Array.isArray(products)) {
                console.log('❌ Products is not an array:', typeof products);
                return 0;
            }
            
            const total = products.reduce((total, item) => {
                const quantity = parseInt(item.quantity) || 0;
                console.log(`📦 Item quantity: ${quantity}`);
                return total + quantity;
            }, 0);
            
            console.log('✅ Total items calculated by helper:', total);
            return total;
        },
        // Helper para JSON stringify (para debugging)
        json: function(context) {
            return JSON.stringify(context, null, 2);
        },
        // Helper adicional para obtener el primer elemento de un array
        first: function(array) {
            return array && array.length > 0 ? array[0] : null;
        },
        // Helper para debugging - mostrar tipo de dato
        debugType: function(data) {
            console.log('🐛 Debug type:', typeof data, data);
            return typeof data;
        }
    }
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
    
    // Enviar productos actuales al cliente recién conectado
    productManager.getProducts().then(products => {
        socket.emit('updateProducts', products);
    }).catch(error => {
        console.error('❌ Error al obtener productos:', error);
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
            const products = await productManager.getProducts();
            
            // Emitir a todos los clientes
            io.emit('updateProducts', products);
            socket.emit('productAdded', { success: true, product: newProduct });
            
            console.log('✅ Producto agregado exitosamente:', newProduct._id);
        } catch (error) {
            console.error('❌ Error al agregar producto:', error);
            socket.emit('error', { message: error.message });
        }
    });
    
    // ACTUALIZAR PRODUCTO - NUEVA FUNCIONALIDAD
    socket.on('updateProduct', async (data) => {
        try {
            const { productId, productData } = data;
            console.log('✏️ Actualizando producto vía WebSocket:', productId, productData);
            
            // Validar que se proporcionaron los datos necesarios
            if (!productId || !productData) {
                throw new Error('ID del producto y datos son requeridos');
            }
            
            // Actualizar el producto
            const updatedProduct = await productManager.updateProductById(productId, productData);
            
            // Obtener lista actualizada
            const products = await productManager.getProducts();
            
            // Emitir a todos los clientes
            io.emit('updateProducts', products);
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
            const products = await productManager.getProducts();
            
            // Emitir a todos los clientes
            io.emit('updateProducts', products);
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