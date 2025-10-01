/**
 * Configuración de WebSockets con Autenticación
 * ✅ Protección completa de eventos admin
 */

import ProductManager from '../managers/ProductManager.js';
import jwt from 'jsonwebtoken';
import UserDAO from '../dao/UserDAO.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';

export const configureWebSockets = (io) => {
    const productManager = new ProductManager();
    const userDAO = new UserDAO();
    
    // ✅ MIDDLEWARE DE AUTENTICACIÓN PARA SOCKET.IO
    io.use(async (socket, next) => {
        try {
            console.log('🔐 [WebSocket] Autenticando conexión...');
            
            // Obtener token del handshake
            const token = socket.handshake.auth.token || 
                          socket.handshake.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                console.log('⚠️ [WebSocket] Conexión sin token - Modo invitado');
                // Permitir conexión pero marcar como invitado
                socket.user = null;
                socket.isGuest = true;
                return next();
            }
            
            // Verificar token
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('✅ [WebSocket] Token verificado:', decoded.email);
            
            // Obtener usuario completo
            const user = await userDAO.findById(decoded.id);
            
            if (!user) {
                console.log('❌ [WebSocket] Usuario no encontrado');
                socket.user = null;
                socket.isGuest = true;
                return next();
            }
            
            // Guardar info del usuario en el socket
            socket.user = {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                first_name: user.first_name
            };
            socket.isGuest = false;
            
            console.log('✅ [WebSocket] Usuario autenticado:', {
                email: socket.user.email,
                role: socket.user.role
            });
            
            next();
        } catch (error) {
            console.error('❌ [WebSocket] Error en autenticación:', error.message);
            // Permitir conexión como invitado en caso de error
            socket.user = null;
            socket.isGuest = true;
            next();
        }
    });
    
    io.on('connection', (socket) => {
        console.log('🔌 [WebSocket] Nueva conexión:', {
            id: socket.id,
            user: socket.user?.email || 'invitado',
            role: socket.user?.role || 'guest'
        });
        
        // Enviar productos iniciales (público)
        productManager.getProducts({ limit: 100, status: undefined })
            .then(result => {
                socket.emit('updateProducts', result.payload);
                console.log('📦 [WebSocket] Productos enviados a:', socket.user?.email || 'invitado');
            })
            .catch(error => {
                socket.emit('error', { message: 'Error al cargar productos' });
            });
        
        // ✅ HELPER: Verificar si es admin
        const isAdmin = () => {
            return socket.user && socket.user.role === 'admin';
        };
        
        // ✅ HELPER: Enviar error de autorización
        const sendUnauthorized = (action) => {
            console.log('🚫 [WebSocket] Acceso denegado:', {
                action,
                user: socket.user?.email || 'invitado',
                role: socket.user?.role || 'guest'
            });
            
            socket.emit('error', {
                message: `No tienes permisos para ${action}. Solo administradores pueden realizar esta acción.`,
                code: 'FORBIDDEN',
                action
            });
        };
        
        // ========================================
        // EVENTO: Agregar Producto (SOLO ADMIN)
        // ========================================
        socket.on('addProduct', async (productData) => {
            try {
                // ✅ VERIFICAR PERMISOS
                if (!isAdmin()) {
                    return sendUnauthorized('agregar productos');
                }
                
                console.log('➕ [WebSocket Admin] Agregando producto:', {
                    admin: socket.user.email,
                    product: productData.title
                });
                
                const newProduct = await productManager.addProduct(productData);
                const result = await productManager.getProducts({ limit: 100, status: undefined });
                
                // Emitir a TODOS los clientes conectados
                io.emit('updateProducts', result.payload);
                
                socket.emit('productAdded', { 
                    success: true, 
                    product: newProduct,
                    message: 'Producto agregado exitosamente'
                });
                
                console.log('✅ [WebSocket Admin] Producto agregado:', newProduct._id);
                
            } catch (error) {
                console.error('❌ [WebSocket] Error agregando producto:', error.message);
                socket.emit('productAdded', { 
                    success: false, 
                    message: error.message 
                });
            }
        });
        
        // ========================================
        // EVENTO: Actualizar Producto (SOLO ADMIN)
        // ========================================
        socket.on('updateProduct', async (data) => {
            try {
                // ✅ VERIFICAR PERMISOS
                if (!isAdmin()) {
                    return sendUnauthorized('actualizar productos');
                }
                
                console.log('🔄 [WebSocket Admin] Actualizando producto:', {
                    admin: socket.user.email,
                    productId: data.productId
                });
                
                const { productId, productData } = data;
                const updatedProduct = await productManager.updateProductById(productId, productData);
                const result = await productManager.getProducts({ limit: 100, status: undefined });
                
                // Emitir a TODOS los clientes conectados
                io.emit('updateProducts', result.payload);
                
                socket.emit('productUpdated', { 
                    success: true, 
                    product: updatedProduct,
                    message: 'Producto actualizado exitosamente'
                });
                
                console.log('✅ [WebSocket Admin] Producto actualizado:', updatedProduct._id);
                
            } catch (error) {
                console.error('❌ [WebSocket] Error actualizando producto:', error.message);
                socket.emit('productUpdated', { 
                    success: false, 
                    message: error.message 
                });
            }
        });
        
        // ========================================
        // EVENTO: Eliminar Producto (SOLO ADMIN)
        // ========================================
        socket.on('deleteProduct', async (productId) => {
            try {
                // ✅ VERIFICAR PERMISOS
                if (!isAdmin()) {
                    return sendUnauthorized('eliminar productos');
                }
                
                console.log('🗑️ [WebSocket Admin] Eliminando producto:', {
                    admin: socket.user.email,
                    productId
                });
                
                await productManager.deleteProductById(productId);
                const result = await productManager.getProducts({ limit: 100, status: undefined });
                
                // Emitir a TODOS los clientes conectados
                io.emit('updateProducts', result.payload);
                
                socket.emit('productDeleted', { 
                    success: true, 
                    productId,
                    message: 'Producto eliminado exitosamente'
                });
                
                console.log('✅ [WebSocket Admin] Producto eliminado:', productId);
                
            } catch (error) {
                console.error('❌ [WebSocket] Error eliminando producto:', error.message);
                socket.emit('error', { 
                    message: error.message 
                });
            }
        });
        
        // ========================================
        // EVENTO: Solicitar productos (Público)
        // ========================================
        socket.on('requestProducts', async () => {
            try {
                console.log('📡 [WebSocket] Solicitud de productos de:', socket.user?.email || 'invitado');
                
                const result = await productManager.getProducts({ limit: 100, status: undefined });
                socket.emit('updateProducts', result.payload);
                
            } catch (error) {
                console.error('❌ [WebSocket] Error obteniendo productos:', error.message);
                socket.emit('error', { message: 'Error al cargar productos' });
            }
        });
        
        // ========================================
        // DESCONEXIÓN
        // ========================================
        socket.on('disconnect', () => {
            console.log('🔌 [WebSocket] Cliente desconectado:', {
                id: socket.id,
                user: socket.user?.email || 'invitado'
            });
        });
    });
    
    console.log('✅ [WebSocket] Configuración completada con autenticación');
};