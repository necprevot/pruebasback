import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from 'dotenv';
import passport from 'passport';
import cookieParser from 'cookie-parser';

import connectDB, { waitForConnection } from './src/config/database.js';
import { configureExpress } from './src/config/express.js';
import { configureHandlebars } from './src/config/handlebars.js';
import { configureWebSockets } from './src/config/websockets.js';
import { initializePassport } from './src/config/passport.js';

// NUEVO: Importar error handler mejorado
import { errorHandler } from './src/utils/CustomErrors.js';
import { notFoundHandler } from './src/middleware/errorHandler.js';

import productsRouter from './src/routes/products.router.js';
import cartsRouter from './src/routes/carts.router.js';
import viewsRouter from './src/routes/views.router.js';
import usersRouter from './src/routes/users.router.js';        
import sessionsRouter from './src/routes/sessions.router.js';
import emailTestRouter from './src/routes/emailTest.router.js';
// NUEVO: Importar router de órdenes
import ordersRouter from './src/routes/orders.router.js';

import { logger } from './src/utils/logger.js';

dotenv.config();

console.log('🚀 === INICIANDO BBFERMENTOS - ARQUITECTURA MEJORADA ===');
console.log('📋 Funcionalidades implementadas:');
console.log('   ✅ Modelo User con campos requeridos');
console.log('   ✅ Encriptación con bcrypt.hashSync');
console.log('   ✅ Estrategias de Passport (jwt, current)');
console.log('   ✅ Sistema de Login con JWT');
console.log('   ✅ Endpoint /api/sessions/current');
console.log('   ✅ Patrón DAO y Repository implementado');
console.log('   ✅ Sistema de emails con Nodemailer');
console.log('   ✅ Sistema de errores personalizados - NUEVO');
console.log('   ✅ Constantes centralizadas - NUEVO');
console.log('   ✅ Sistema completo de órdenes - NUEVO');
console.log('   ✅ Permisos granulares por rol - NUEVO');

const startServer = async () => {
    try {
        const app = express();
        const httpServer = createServer(app);
        const io = new Server(httpServer);

        // Middlewares globales
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(cookieParser());
        
        configureExpress(app);
        configureHandlebars(app);
        
        console.log('🔌 Conectando a base de datos...');
        await connectDB();
        await waitForConnection();
        console.log('✅ Base de datos conectada');
        
        console.log('🔐 Inicializando estrategias de Passport...');
        initializePassport();
        app.use(passport.initialize());
        console.log('✅ Passport inicializado con estrategias: jwt, current');
        
        app.set('io', io);
        
        
        // ========================================
        // RUTAS API - DEBEN IR ANTES DE LAS RUTAS DE VISTAS
        // ========================================
        console.log('📋 Registrando rutas API...');
        app.use('/api/products', productsRouter);
        app.use('/api/carts', cartsRouter);
        app.use('/api/users', usersRouter);
        app.use('/api/sessions', sessionsRouter);
        app.use('/api/email', emailTestRouter);
        
        // NUEVO: Ruta de órdenes
        app.use('/api/orders', ordersRouter);
        console.log('✅ Ruta de órdenes registrada: /api/orders');
        
        console.log('✅ Rutas API registradas');
        
        // ========================================
        // RUTAS DE VISTAS - DESPUÉS DE LAS RUTAS API
        // ========================================
        console.log('📋 Registrando rutas de vistas...');
        app.use('/', viewsRouter);
        console.log('✅ Rutas de vistas registradas');
        
        // ========================================
        // WebSockets
        // ========================================
        configureWebSockets(io);
        
        // ========================================
        // ERROR HANDLERS - DEBEN IR AL FINAL
        // ========================================
        console.log('⚠️ Configurando manejadores de errores...');
        
        // 404 - Ruta no encontrada
        app.use('*', notFoundHandler);
        
        // NUEVO: Error handler mejorado
        // Reemplaza el globalErrorHandler antiguo
        app.use(errorHandler);
        
        console.log('✅ Manejadores de errores configurados');
        
        // ========================================
        // INICIAR SERVIDOR
        // ========================================
        const PORT = process.env.PORT || 8080;
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log('\n🎉 === SERVIDOR INICIADO EXITOSAMENTE ===');
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log('\n📋 === ENDPOINTS PARA EVALUACIÓN ===');
            
            console.log('\n👤 CRUD Usuarios:');
            console.log('   POST /api/users/register     - Registrar usuario');
            console.log('   GET  /api/users/:id          - Obtener usuario (JWT)');
            
            console.log('\n🔐 Autenticación:');
            console.log('   POST /api/sessions/login           - Login (genera JWT)');
            console.log('   GET  /api/sessions/current         - Validar usuario (JWT)');
            console.log('   POST /api/sessions/logout          - Logout');
            console.log('   POST /api/sessions/forgot-password - Solicitar reset');
            console.log('   POST /api/sessions/reset-password  - Resetear contraseña');
            
            console.log('\n📦 Gestión de Órdenes - NUEVO:');
            console.log('   POST   /api/orders                 - Crear orden desde carrito');
            console.log('   GET    /api/orders/user/me         - Mis órdenes');
            console.log('   GET    /api/orders/:id             - Detalle de orden');
            console.log('   POST   /api/orders/:id/cancel      - Cancelar orden');
            console.log('   GET    /api/orders                 - Todas las órdenes (Admin)');
            console.log('   PATCH  /api/orders/:id/status      - Actualizar estado (Admin)');
            console.log('   POST   /api/orders/:id/confirm-payment - Confirmar pago (Admin)');
            console.log('   GET    /api/orders/stats           - Estadísticas (Admin)');
            
            console.log('\n📧 Testing de Emails:');
            console.log('   GET  /api/email/status       - Estado del servicio');
            console.log('   GET  /api/email/test         - Probar configuración');
            console.log('   POST /api/email/send-test    - Enviar email de prueba');
            console.log('   POST /api/email/send-welcome - Enviar email de bienvenida');
            
            console.log('\n🛒 Funcionalidad existente:');
            console.log('   GET  /api/products           - Catálogo');
            console.log('   GET  /api/carts/:id          - Carrito');
            console.log('   GET  /                       - Vista web');
            
            console.log('\n✅ === MEJORAS IMPLEMENTADAS ===');
            console.log('   ✅ Modelo User completo');
            console.log('   ✅ bcrypt.hashSync implementado');
            console.log('   ✅ Estrategias Passport configuradas');
            console.log('   ✅ Sistema Login con JWT');
            console.log('   ✅ Endpoint /current funcional');
            console.log('   ✅ Patrón DAO y Repository');
            console.log('   ✅ Emails automáticos');
            console.log('   ✅ Sistema de recuperación de contraseña');
            console.log('   ✅ Constantes centralizadas - NUEVO');
            console.log('   ✅ Errores personalizados - NUEVO');
            console.log('   ✅ Sistema completo de órdenes - NUEVO');
            console.log('   ✅ Transacciones de BD - NUEVO');
            console.log('   ✅ Permisos granulares - NUEVO');
            console.log('   ✅ Rate limiting por rol - NUEVO');
            console.log('=====================================\n');
        });
        
    } catch (error) {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    }
};

// Iniciar el servidor
startServer();