// src/middleware/auth.js
import passport from 'passport';

/**
 * Middleware de autenticación con JWT
 * Verifica que el usuario tenga un token válido
 */
export const authenticate = (req, res, next) => {
    console.log('🔐 [Auth] Verificando autenticación JWT');
    
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            console.error('❌ [Auth] Error en autenticación:', err.message);
            return res.status(500).json({
                status: 'error',
                message: 'Error interno de autenticación'
            });
        }
        
        if (!user) {
            console.log('❌ [Auth] Token inválido o usuario no encontrado');
            console.log('❌ [Auth] Info:', info);
            return res.status(401).json({
                status: 'error',
                message: 'No autenticado - Token inválido o inexistente'
            });
        }
        
        console.log('✅ [Auth] Usuario autenticado:', user.email);
        req.user = user;
        next();
    })(req, res, next);
};

/**
 * Middleware de autorización por roles
 * Verifica que el usuario tenga uno de los roles permitidos
 * 
 * @param {...string} allowedRoles - Roles permitidos
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.post('/products', authenticate, authorize('admin'), controller);
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        console.log('👮 [Auth] Verificando autorización para roles:', allowedRoles);
        
        // Verificar que el usuario esté autenticado
        if (!req.user) {
            console.log('❌ [Auth] No hay usuario autenticado');
            return res.status(401).json({
                status: 'error',
                message: 'No autenticado - Debe iniciar sesión primero'
            });
        }
        
        // Si no hay roles especificados, permitir acceso
        if (allowedRoles.length === 0) {
            console.log('✅ [Auth] Sin restricciones de rol');
            return next();
        }
        
        // Verificar que el usuario tenga uno de los roles permitidos
        if (!allowedRoles.includes(req.user.role)) {
            console.log('❌ [Auth] Rol no autorizado:', {
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                userId: req.user._id
            });
            return res.status(403).json({
                status: 'error',
                message: `Acceso denegado - Se requiere rol: ${allowedRoles.join(' o ')}`
            });
        }
        
        console.log('✅ [Auth] Rol autorizado:', req.user.role);
        next();
    };
};

/**
 * Middleware para verificar propiedad del recurso
 * Permite acceso si el usuario es admin o si es el propietario del recurso
 * 
 * @param {string} resourceIdParam - Nombre del parámetro que contiene el ID del recurso
 * @param {string} userIdField - Campo del usuario que contiene su ID (por defecto '_id')
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.get('/users/:id', authenticate, authorizeOwnerOrAdmin('id'), controller);
 */
export const authorizeOwnerOrAdmin = (resourceIdParam = 'id', userIdField = '_id') => {
    return (req, res, next) => {
        console.log('🔍 [Auth] Verificando propiedad del recurso');
        
        if (!req.user) {
            console.log('❌ [Auth] No hay usuario autenticado');
            return res.status(401).json({
                status: 'error',
                message: 'No autenticado'
            });
        }
        
        // Si es admin, permitir acceso
        if (req.user.role === 'admin') {
            console.log('✅ [Auth] Usuario es admin, acceso permitido');
            return next();
        }
        
        // Verificar propiedad del recurso
        const resourceId = req.params[resourceIdParam];
        const userId = req.user[userIdField]?.toString() || req.user._id?.toString();
        
        if (!resourceId) {
            console.log('❌ [Auth] ID de recurso no encontrado en parámetros');
            return res.status(400).json({
                status: 'error',
                message: 'ID de recurso no válido'
            });
        }
        
        if (resourceId === userId) {
            console.log('✅ [Auth] Usuario es propietario del recurso');
            return next();
        }
        
        console.log('❌ [Auth] Usuario no es propietario:', {
            resourceId,
            userId,
            userRole: req.user.role
        });
        
        return res.status(403).json({
            status: 'error',
            message: 'No tienes permiso para acceder a este recurso'
        });
    };
};

/**
 * Middleware para verificar propiedad del carrito
 * Verifica que el carrito pertenezca al usuario autenticado
 * 
 * @example
 * router.post('/carts/:cid/product/:pid', authenticate, authorizeCartOwner, controller);
 */
export const authorizeCartOwner = async (req, res, next) => {
    try {
        console.log('🛒 [Auth] Verificando propiedad del carrito');
        
        if (!req.user) {
            console.log('❌ [Auth] No hay usuario autenticado');
            return res.status(401).json({
                status: 'error',
                message: 'No autenticado'
            });
        }
        
        // Si es admin, permitir acceso
        if (req.user.role === 'admin') {
            console.log('✅ [Auth] Usuario es admin, acceso permitido');
            return next();
        }
        
        const cartId = req.params.cid;
        const userCartId = req.user.cart?.toString();
        
        if (!cartId) {
            console.log('❌ [Auth] ID de carrito no encontrado en parámetros');
            return res.status(400).json({
                status: 'error',
                message: 'ID de carrito no válido'
            });
        }
        
        if (!userCartId) {
            console.log('❌ [Auth] Usuario no tiene carrito asignado');
            return res.status(403).json({
                status: 'error',
                message: 'No tienes un carrito asignado'
            });
        }
        
        if (cartId === userCartId) {
            console.log('✅ [Auth] Usuario es propietario del carrito');
            return next();
        }
        
        console.log('❌ [Auth] Usuario no es propietario del carrito:', {
            requestedCartId: cartId,
            userCartId: userCartId,
            userId: req.user._id
        });
        
        return res.status(403).json({
            status: 'error',
            message: 'No puedes modificar un carrito que no te pertenece'
        });
        
    } catch (error) {
        console.error('❌ [Auth] Error verificando propiedad del carrito:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor'
        });
    }
};

/**
 * Middleware para endpoints públicos que pueden tener usuario opcional
 * Si hay token, lo valida, pero no requiere autenticación
 * 
 * @example
 * router.get('/products', optionalAuth, controller);
 */
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    // Si no hay header de autorización, continuar sin usuario
    if (!authHeader) {
        console.log('ℹ️ [Auth] No se proporcionó token, continuando sin autenticación');
        return next();
    }
    
    // Si hay token, intentar validarlo
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            console.error('❌ [Auth] Error validando token:', err.message);
            // Continuar sin usuario en caso de error
            return next();
        }
        
        if (user) {
            console.log('✅ [Auth] Token válido, usuario autenticado:', user.email);
            req.user = user;
        } else {
            console.log('⚠️ [Auth] Token inválido o expirado, continuando sin autenticación');
        }
        
        next();
    })(req, res, next);
};

/**
 * Middleware para verificar que el usuario NO esté autenticado
 * Útil para rutas como login y register
 * 
 * @example
 * router.post('/sessions/login', requireGuest, controller);
 */
export const requireGuest = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return next();
    }
    
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (user) {
            console.log('⚠️ [Auth] Usuario ya autenticado intentando acceder a ruta de invitado');
            return res.status(400).json({
                status: 'error',
                message: 'Ya tienes una sesión activa'
            });
        }
        next();
    })(req, res, next);
};