/**
 * Middleware de autenticación para vistas (renderizado HTML)
 * Redirige en lugar de devolver JSON
 */

import passport from 'passport';

/**
 * Middleware de autenticación para vistas
 * Si no está autenticado, redirige al login
 */
export const authenticateView = (req, res, next) => {
    console.log('🔐 [AuthView] Verificando autenticación para vista');
    
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            console.error('❌ [AuthView] Error en autenticación:', err.message);
            return res.redirect('/login?error=auth_error');
        }
        
        if (!user) {
            console.log('❌ [AuthView] Usuario no autenticado, redirigiendo al login');
            // Guardar URL original para redirigir después del login
            req.session = req.session || {};
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login?error=auth_required');
        }
        
        console.log('✅ [AuthView] Usuario autenticado:', user.email);
        req.user = user;
        next();
    })(req, res, next);
};

/**
 * Middleware de autorización por rol para vistas
 * Si no tiene el rol, redirige a una página de error
 */
export const authorizeView = (...allowedRoles) => {
    return (req, res, next) => {
        console.log('👮 [AuthView] Verificando autorización para roles:', allowedRoles);
        
        if (!req.user) {
            console.log('❌ [AuthView] No hay usuario autenticado');
            return res.redirect('/login?error=auth_required');
        }
        
        if (allowedRoles.length === 0) {
            console.log('✅ [AuthView] Sin restricciones de rol');
            return next();
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            console.log('❌ [AuthView] Rol no autorizado:', {
                userRole: req.user.role,
                requiredRoles: allowedRoles
            });
            
            // Renderizar página de error de acceso denegado
            return res.status(403).render('error', {
                title: 'Acceso Denegado',
                status: 403,
                message: 'No tienes permisos para acceder a esta página. Esta área está reservada para administradores.',
                url: req.originalUrl,
                backUrl: '/products'
            });
        }
        
        console.log('✅ [AuthView] Rol autorizado:', req.user.role);
        next();
    };
};

/**
 * Middleware opcional de autenticación para vistas
 * No redirige si no está autenticado, solo pasa el usuario si existe
 */
export const optionalAuthView = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (err) {
            console.error('⚠️ [AuthView] Error en autenticación opcional:', err.message);
        }
        
        if (user) {
            console.log('✅ [AuthView] Usuario autenticado (opcional):', user.email);
            req.user = user;
        } else {
            console.log('ℹ️ [AuthView] Continuando sin autenticación');
        }
        
        next();
    })(req, res, next);
};