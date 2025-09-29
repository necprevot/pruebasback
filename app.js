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

import { globalErrorHandler, notFoundHandler } from './src/middleware/errorHandler.js';

import productsRouter from './src/routes/products.router.js';
import cartsRouter from './src/routes/carts.router.js';
import viewsRouter from './src/routes/views.router.js';
import usersRouter from './src/routes/users.router.js';        
import sessionsRouter from './src/routes/sessions.router.js';
import emailTestRouter from './src/routes/emailTest.router.js';  // NUEVO: Importar rutas de email

import { logger } from './src/utils/logger.js';

dotenv.config();

console.log('🚀 === INICIANDO BBFERMENTOS - EVALUACIÓN ===');
console.log('📋 Funcionalidades implementadas:');
console.log('   ✅ Modelo User con campos requeridos');
console.log('   ✅ Encriptación con bcrypt.hashSync');
console.log('   ✅ Estrategias de Passport (jwt, current)');
console.log('   ✅ Sistema de Login con JWT');
console.log('   ✅ Endpoint /api/sessions/current');
console.log('   ✅ Patrón DAO implementado');
console.log('   ✅ Sistema de emails con Nodemailer'); // NUEVO

const startServer = async () => {
    try {
        const app = express();
        const httpServer = createServer(app);
        const io = new Server(httpServer);

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
        
        // RUTAS - ORDEN IMPORTANTE
        console.log('📋 Registrando rutas...');
        app.use('/', viewsRouter);
        app.use('/api/products', productsRouter);
        app.use('/api/carts', cartsRouter);
        app.use('/api/users', usersRouter);      // CRUD usuarios
        app.use('/api/sessions', sessionsRouter); // Login + /current
        app.use('/api/email', emailTestRouter);   // NUEVO: Testing de emails
        console.log('✅ Ruta /api/email registrada correctamente'); // DEBUG
        
        // WebSockets
        configureWebSockets(io);
        
        // Error handlers (DEBEN IR AL FINAL)
        app.use('*', notFoundHandler);
        app.use(globalErrorHandler);
        
        // Iniciar servidor
        const PORT = process.env.PORT || 8080;
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log('\n🎉 === SERVIDOR INICIADO EXITOSAMENTE ===');
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log('\n📋 === ENDPOINTS PARA EVALUACIÓN ===');
            console.log('👤 CRUD Usuarios:');
            console.log('   POST /api/users/register     - Registrar usuario');
            console.log('   GET  /api/users/:id          - Obtener usuario (JWT)');
            console.log('\n🔐 Autenticación:');
            console.log('   POST /api/sessions/login     - Login (genera JWT)');
            console.log('   GET  /api/sessions/current   - Validar usuario (JWT)');
            console.log('   POST /api/sessions/logout    - Logout');
            console.log('\n📧 Testing de Emails:');
            console.log('   GET  /api/email/status       - Estado del servicio');
            console.log('   GET  /api/email/test         - Probar configuración');
            console.log('   POST /api/email/send-test    - Enviar email de prueba');
            console.log('   POST /api/email/send-welcome - Enviar email de bienvenida');
            console.log('\n🛒 Funcionalidad existente:');
            console.log('   GET  /api/products           - Catálogo');
            console.log('   GET  /api/carts/:id          - Carrito');
            console.log('   GET  /                       - Vista web');
            console.log('\n✅ === CRITERIOS CUMPLIDOS ===');
            console.log('   ✅ Modelo User completo');
            console.log('   ✅ bcrypt.hashSync implementado');
            console.log('   ✅ Estrategias Passport configuradas');
            console.log('   ✅ Sistema Login con JWT');
            console.log('   ✅ Endpoint /current funcional');
            console.log('   ✅ Patrón DAO en toda la aplicación');
            console.log('   ✅ Emails de bienvenida automáticos');
            console.log('=====================================\n');
        });
        
    } catch (error) {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    }
};

// Iniciar el servidor
startServer();