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
    // Helper existente para multiplicar (precio * cantidad)
    multiply: function(a, b) {
        return a * b;
    },
    
    // Helper existente para obtener total de items - CORREGIDO
    getTotalItems: function(products) {
        console.log('🔢 getTotalItems helper called with:', products);
        
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
    
    // Helper existente para JSON stringify (para debugging)
    json: function(context) {
        return JSON.stringify(context, null, 2);
    },
    
    // Helper existente para obtener el primer elemento de un array
    first: function(array) {
        return array && array.length > 0 ? array[0] : null;
    },
    
    // Helper existente para debugging - mostrar tipo de dato
    debugType: function(data) {
        console.log('🐛 Debug type:', typeof data, data);
        return typeof data;
    },

    // NUEVOS HELPERS PARA FILTROS Y PAGINACIÓN

    // Helper para comparar valores (útil para selects)
    eq: function(a, b) {
        return a === b;
    },

    // Helper para comparar si un valor es mayor que otro
    gt: function(a, b) {
        return a > b;
    },

    // Helper para comparar si un valor es menor que otro
    lt: function(a, b) {
        return a < b;
    },

    // Helper para comparar si un valor es mayor o igual que otro
    gte: function(a, b) {
        return a >= b;
    },

    // Helper para comparar si un valor es menor o igual que otro
    lte: function(a, b) {
        return a <= b;
    },

    // Helper para sumar valores
    add: function(a, b) {
        return parseInt(a) + parseInt(b);
    },

    // Helper para restar valores
    subtract: function(a, b) {
        return parseInt(a) - parseInt(b);
    },

    // Helper para crear rangos de números (útil para paginación)
    range: function(start, end, min, max) {
        const result = [];
        const actualStart = Math.max(min || 1, start);
        const actualEnd = Math.min(max || end, end);
        
        for (let i = actualStart; i <= actualEnd; i++) {
            result.push(i);
        }
        return result;
    },

    // Helper para construir query strings manteniendo parámetros
    buildQueryString: function(currentQuery, newParams) {
        const params = new URLSearchParams();
        
        // Agregar parámetros actuales
        if (currentQuery) {
            Object.keys(currentQuery).forEach(key => {
                if (currentQuery[key] && currentQuery[key] !== 'all' && currentQuery[key] !== '') {
                    params.set(key, currentQuery[key]);
                }
            });
        }
        
        // Sobrescribir con nuevos parámetros
        if (newParams && typeof newParams === 'object') {
            Object.keys(newParams).forEach(key => {
                if (newParams[key] !== undefined && newParams[key] !== null && newParams[key] !== '') {
                    params.set(key, newParams[key]);
                } else {
                    params.delete(key);
                }
            });
        }
        
        return params.toString();
    },

    // Helper para formatear números con separadores de miles
    formatNumber: function(number) {
        if (typeof number !== 'number') {
            number = parseFloat(number) || 0;
        }
        return number.toLocaleString('es-CL');
    },

    // Helper para formatear precios en pesos chilenos
    formatPrice: function(price) {
        if (typeof price !== 'number') {
            price = parseFloat(price) || 0;
        }
        return '$' + price.toLocaleString('es-CL');
    },

    // Helper para capitalizar texto
    capitalize: function(str) {
        if (typeof str !== 'string') return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Helper para truncar texto
    truncate: function(str, length) {
        if (typeof str !== 'string') return str;
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    },

    // Helper para pluralizar palabras
    pluralize: function(count, singular, plural) {
        return count === 1 ? singular : plural;
    },

    // Helper para obtener la clase CSS basada en el stock
    stockClass: function(stock) {
        if (stock <= 0) return 'text-danger';
        if (stock <= 5) return 'text-warning';
        return 'text-success';
    },

    // Helper para obtener el texto del estado del stock
    stockStatus: function(stock) {
        if (stock <= 0) return 'Sin stock';
        if (stock <= 5) return 'Stock bajo';
        return 'Disponible';
    },

    // Helper para verificar si un array tiene elementos
    hasItems: function(array) {
        return Array.isArray(array) && array.length > 0;
    },

    // Helper para obtener el elemento en un índice específico
    at: function(array, index) {
        return Array.isArray(array) ? array[index] : null;
    },

    // Helper para verificar si un valor está en un array
    includes: function(array, value) {
        return Array.isArray(array) && array.includes(value);
    },

    // Helper para formatear fechas
    formatDate: function(date, format) {
        if (!date) return '';
        
        const d = new Date(date);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        if (format === 'short') {
            options.month = 'short';
        } else if (format === 'time') {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return d.toLocaleDateString('es-CL', options);
    },

    // Helper para calcular días transcurridos
    daysAgo: function(date) {
        if (!date) return '';
        
        const now = new Date();
        const then = new Date(date);
        const diffTime = Math.abs(now - then);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `${diffDays} días`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas`;
        return `${Math.floor(diffDays / 30)} meses`;
    },

    // Helper para generar estrellas de rating
    stars: function(rating, maxStars = 5) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        
        for (let i = 0; i < fullStars; i++) {
            stars += '⭐';
        }
        
        if (hasHalfStar) {
            stars += '⭐'; // Simplificado, podrías usar ⭐ para media estrella
        }
        
        const emptyStars = maxStars - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '☆';
        }
        
        return stars;
    },

    // Helper para obtener un color aleatorio (útil para badges)
    randomColor: function() {
        const colors = ['primary', 'secondary', 'success', 'info', 'warning'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    // Helper para convertir a slug (URLs amigables)
    slug: function(str) {
        if (typeof str !== 'string') return '';
        return str
            .toLowerCase()
            .replace(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/ñ/g, 'n')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    // Helper para obtener iniciales
    initials: function(name) {
        if (typeof name !== 'string') return '';
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    },

    // Helper para determinar si un producto es nuevo (menos de 30 días)
    isNew: function(createdAt) {
        if (!createdAt) return false;
        const now = new Date();
        const created = new Date(createdAt);
        const diffTime = Math.abs(now - created);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
    },

    // Helper para generar gradiente de colores basado en porcentaje
    percentageColor: function(percentage) {
        if (percentage >= 80) return 'success';
        if (percentage >= 60) return 'info';
        if (percentage >= 40) return 'warning';
        return 'danger';
    },

    // Helper para calcular porcentaje
    percentage: function(value, total) {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100);
    },

    // Helper para operaciones lógicas AND
    and: function(a, b) {
        return a && b;
    },

    // Helper para operaciones lógicas OR
    or: function(a, b) {
        return a || b;
    },

    // Helper para negación lógica
    not: function(value) {
        return !value;
    },

    // Helper para verificar si un número está en un rango
    inRange: function(value, min, max) {
        return value >= min && value <= max;
    },

    // Helper para obtener el máximo de dos valores
    max: function(a, b) {
        return Math.max(a, b);
    },

    // Helper para obtener el mínimo de dos valores
    min: function(a, b) {
        return Math.min(a, b);
    },

    // Helper para redondear números
    round: function(number, decimals = 0) {
        return Number(Math.round(number + 'e' + decimals) + 'e-' + decimals);
    },

    // Helper para obtener un elemento aleatorio de un array
    randomItem: function(array) {
        if (!Array.isArray(array) || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    },

    // Helper para ordenar array por propiedad
    sortBy: function(array, property, direction = 'asc') {
        if (!Array.isArray(array)) return array;
        
        return array.sort((a, b) => {
            const aVal = a[property];
            const bVal = b[property];
            
            if (direction === 'desc') {
                return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        });
    },

    // Helper para filtrar array por propiedad
    filterBy: function(array, property, value) {
        if (!Array.isArray(array)) return array;
        return array.filter(item => item[property] === value);
    },

    // Helper para limitar elementos de un array
    limit: function(array, count) {
        if (!Array.isArray(array)) return array;
        return array.slice(0, count);
    },

    // Helper para saltar elementos de un array
    skip: function(array, count) {
        if (!Array.isArray(array)) return array;
        return array.slice(count);
    },

    // Helper para obtener longitud de array u objeto
    length: function(obj) {
        if (Array.isArray(obj)) return obj.length;
        if (typeof obj === 'object' && obj !== null) return Object.keys(obj).length;
        if (typeof obj === 'string') return obj.length;
        return 0;
    },

    // Helper para verificar si está vacío
    isEmpty: function(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        if (typeof obj === 'string') return obj.trim() === '';
        return false;
    },

    // Helper para obtener keys de un objeto
    keys: function(obj) {
        return Object.keys(obj || {});
    },

    // Helper para obtener values de un objeto
    values: function(obj) {
        return Object.values(obj || {});
    },

    // Helper para crear URLs de imágenes con fallback
    imageUrl: function(imagePath, fallback = '/img/no-image.png') {
        if (!imagePath) return fallback;
        if (imagePath.startsWith('http')) return imagePath;
        if (imagePath.startsWith('/')) return imagePath;
        return `/img/${imagePath}`;
    },

    // Helper para generar IDs únicos
    uniqueId: function(prefix = 'id') {
        return prefix + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Helper para escapar HTML
    escapeHtml: function(str) {
        if (typeof str !== 'string') return str;
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // Helper para mostrar texto condicional
    ifCond: function(v1, operator, v2, options) {
        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    },

    // Helper para formatear texto en diferentes casos
    case: function(str, caseType) {
        if (typeof str !== 'string') return str;
        
        switch (caseType) {
            case 'upper':
                return str.toUpperCase();
            case 'lower':
                return str.toLowerCase();
            case 'title':
                return str.replace(/\w\S*/g, (txt) => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
            case 'sentence':
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            case 'camel':
                return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
                    index === 0 ? word.toLowerCase() : word.toUpperCase()
                ).replace(/\s+/g, '');
            case 'kebab':
                return str.toLowerCase().replace(/\s+/g, '-');
            case 'snake':
                return str.toLowerCase().replace(/\s+/g, '_');
            default:
                return str;
        }
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