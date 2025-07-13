// app.js
import express from 'express';
import { engine } from 'express-handlebars';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar routers
import productsRouter from './src/routes/products.router.js';
import cartsRouter from './src/routes/carts.router.js';
import viewsRouter from './src/routes/views.router.js';

// Configuración para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Crear servidor HTTP
const server = createServer(app);
const io = new Server(server);

// Configurar Handlebars
app.engine('handlebars', engine({
    layoutsDir: path.join(__dirname, 'src/views/layouts'),
    defaultLayout: 'main',
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'src/views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use('/', viewsRouter);

// Configurar Socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    // Manejar eventos de productos
    socket.on('productAdded', (product) => {
        // Emitir a todos los clientes conectados
        io.emit('productAdded', product);
    });
    
    socket.on('productDeleted', (productId) => {
        // Emitir a todos los clientes conectados
        io.emit('productDeleted', productId);
    });
    
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Visita: http://localhost:${PORT}`);
});

export default app;