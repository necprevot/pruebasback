import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from 'dotenv';
import passport from 'passport';
import cookieParser from 'cookie-parser';

// Configuraciones
import connectDB, { waitForConnection } from './src/config/database.js';
import { configureExpress } from './src/config/express.js';
import { configureHandlebars } from './src/config/handlebars.js';
import { configureWebSockets } from './src/config/websockets.js';
import { initializePassport } from './src/config/passport.js';

// Middleware
import { globalErrorHandler, notFoundHandler } from './src/middleware/errorHandler.js';

// Rutas
import productsRouter from './src/routes/products.router.js';
import cartsRouter from './src/routes/carts.router.js';
import viewsRouter from './src/routes/views.router.js';
import usersRouter from './src/routes/users.router.js';
import sessionsRouter from './src/routes/sessions.router.js';

// Utils
import { logger } from './src/utils/logger.js';

// Configurar entorno
dotenv.config();

// Función principal asíncrona
const startServer = async () => {
    try {
        const app = express();
        const httpServer = createServer(app);
        const io = new Server(httpServer);

        // Middlewares básicos
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(cookieParser()); 
        
        // Configurar Express y Handlebars
        configureExpress(app);
        configureHandlebars(app);
        
        // Conectar DB
        await connectDB();
        await waitForConnection();
        
        // Inicializar Passport
        initializePassport();
        app.use(passport.initialize());
        
        
        // Configurar rutas
        app.set('io', io);
        app.use('/', viewsRouter);
        app.use('/api/products', productsRouter);
        app.use('/api/carts', cartsRouter);
        app.use('/api/users', usersRouter);
        app.use('/api/sessions', sessionsRouter);
        
        // WebSockets
        configureWebSockets(io);
        
        // Error handlers
        app.use('*', notFoundHandler);
        app.use(globalErrorHandler);
        
        // Iniciar servidor
        const PORT = process.env.PORT || 8080;
        httpServer.listen(PORT, '0.0.0.0', () => {
            logger.success(`Servidor iniciado en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    }
};

// Iniciar el servidor
startServer();