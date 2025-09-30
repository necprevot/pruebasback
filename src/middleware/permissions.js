/**
 * Sistema de permisos basado en roles y acciones
 * Permite un control granular de acceso a recursos
 */

import { USER_ROLES, ROLE_PERMISSIONS } from '../config/constants.js';
import { AuthorizationError, NotFoundError } from '../utils/CustomErrors.js';

/**
 * Verificar si un usuario tiene un permiso específico
 */
export function hasPermission(userRole, permission) {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Middleware para requerir un permiso específico
 * 
 * @param {string} permission - Permiso requerido (ej: 'products:create')
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.post('/products', authenticate, requirePermission('products:create'), controller);
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    console.log('🔐 [Permissions] Verificando permiso:', permission);
    
    if (!req.user) {
      throw new AuthorizationError('Usuario no autenticado');
    }
    
    const userRole = req.user.role || USER_ROLES.GUEST;
    
    if (hasPermission(userRole, permission)) {
      console.log('✅ [Permissions] Permiso concedido:', permission, 'para rol:', userRole);
      return next();
    }
    
    console.log('❌ [Permissions] Permiso denegado:', permission, 'para rol:', userRole);
    throw new AuthorizationError(
      `No tienes permiso para realizar esta acción. Permiso requerido: ${permission}`
    );
  };
}

/**
 * Middleware para requerir múltiples permisos (AND)
 * Usuario debe tener TODOS los permisos
 * 
 * @param {...string} permissions - Permisos requeridos
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.post('/admin/action', authenticate, requireAllPermissions('products:update', 'users:read'), controller);
 */
export function requireAllPermissions(...permissions) {
  return (req, res, next) => {
    console.log('🔐 [Permissions] Verificando todos los permisos:', permissions);
    
    if (!req.user) {
      throw new AuthorizationError('Usuario no autenticado');
    }
    
    const userRole = req.user.role || USER_ROLES.GUEST;
    const hasAll = permissions.every(permission => hasPermission(userRole, permission));
    
    if (hasAll) {
      console.log('✅ [Permissions] Todos los permisos concedidos');
      return next();
    }
    
    console.log('❌ [Permissions] Faltan permisos');
    throw new AuthorizationError(
      `No tienes todos los permisos necesarios para esta acción`
    );
  };
}

/**
 * Middleware para requerir al menos uno de varios permisos (OR)
 * Usuario debe tener AL MENOS UNO de los permisos
 * 
 * @param {...string} permissions - Permisos requeridos
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.get('/orders', authenticate, requireAnyPermission('orders:read', 'orders:read_own'), controller);
 */
export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    console.log('🔐 [Permissions] Verificando cualquier permiso:', permissions);
    
    if (!req.user) {
      throw new AuthorizationError('Usuario no autenticado');
    }
    
    const userRole = req.user.role || USER_ROLES.GUEST;
    const hasAny = permissions.some(permission => hasPermission(userRole, permission));
    
    if (hasAny) {
      console.log('✅ [Permissions] Al menos un permiso concedido');
      return next();
    }
    
    console.log('❌ [Permissions] Ningún permiso concedido');
    throw new AuthorizationError(
      `No tienes ninguno de los permisos necesarios para esta acción`
    );
  };
}

/**
 * Middleware para verificar propiedad de recurso o ser admin
 * Útil para endpoints donde el usuario puede ver/editar solo sus propios recursos
 * 
 * @param {Function} getResourceOwnerId - Función que obtiene el ID del propietario del recurso
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.get('/orders/:id', 
 *   authenticate, 
 *   requireOwnershipOrAdmin(async (req) => {
 *     const order = await Order.findById(req.params.id);
 *     return order.user;
 *   }), 
 *   controller
 * );
 */
export function requireOwnershipOrAdmin(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      console.log('🔐 [Permissions] Verificando propiedad o admin');
      
      if (!req.user) {
        throw new AuthorizationError('Usuario no autenticado');
      }
      
      // Si es admin, permitir acceso
      if (req.user.role === USER_ROLES.ADMIN) {
        console.log('✅ [Permissions] Usuario es admin, acceso concedido');
        return next();
      }
      
      // Obtener ID del propietario del recurso
      const ownerId = await getResourceOwnerId(req);
      
      if (!ownerId) {
        throw new NotFoundError('Recurso');
      }
      
      // Verificar propiedad
      const userId = req.user._id?.toString() || req.user.id?.toString();
      const ownerIdStr = ownerId.toString();
      
      if (userId === ownerIdStr) {
        console.log('✅ [Permissions] Usuario es propietario, acceso concedido');
        return next();
      }
      
      console.log('❌ [Permissions] Usuario no es propietario ni admin');
      throw new AuthorizationError('No tienes permiso para acceder a este recurso');
      
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para permitir acceso solo a recursos propios
 * Similar a requireOwnershipOrAdmin pero sin permitir admin
 * 
 * @param {Function} getResourceOwnerId - Función que obtiene el ID del propietario
 * @returns {Function} Middleware de Express
 */
export function requireOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      console.log('🔐 [Permissions] Verificando propiedad estricta');
      
      if (!req.user) {
        throw new AuthorizationError('Usuario no autenticado');
      }
      
      const ownerId = await getResourceOwnerId(req);
      
      if (!ownerId) {
        throw new NotFoundError('Recurso');
      }
      
      const userId = req.user._id?.toString() || req.user.id?.toString();
      const ownerIdStr = ownerId.toString();
      
      if (userId === ownerIdStr) {
        console.log('✅ [Permissions] Usuario es propietario');
        return next();
      }
      
      console.log('❌ [Permissions] Usuario no es propietario');
      throw new AuthorizationError('No tienes permiso para acceder a este recurso');
      
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para verificar upgrade a premium
 * Bloquea acceso si el usuario no es premium o admin
 */
export function requirePremium(req, res, next) {
  console.log('💎 [Permissions] Verificando usuario premium');
  
  if (!req.user) {
    throw new AuthorizationError('Usuario no autenticado');
  }
  
  const userRole = req.user.role;
  
  if (userRole === USER_ROLES.PREMIUM || userRole === USER_ROLES.ADMIN) {
    console.log('✅ [Permissions] Usuario es premium o admin');
    return next();
  }
  
  console.log('❌ [Permissions] Usuario no es premium');
  throw new AuthorizationError(
    'Esta funcionalidad está disponible solo para usuarios premium. Actualiza tu cuenta para acceder.'
  );
}

/**
 * Helper para verificar si el usuario actual es propietario de un recurso
 */
export function isOwner(userId, resourceOwnerId) {
  if (!userId || !resourceOwnerId) return false;
  return userId.toString() === resourceOwnerId.toString();
}

/**
 * Helper para verificar si el usuario es admin
 */
export function isAdmin(userRole) {
  return userRole === USER_ROLES.ADMIN;
}

/**
 * Helper para verificar si el usuario es premium o admin
 */
export function isPremiumOrAdmin(userRole) {
  return userRole === USER_ROLES.PREMIUM || userRole === USER_ROLES.ADMIN;
}

/**
 * Middleware de rate limiting basado en rol
 * Diferentes límites para diferentes roles
 */
const rateLimitStore = new Map();

export function rolBasedRateLimit(limits = {}) {
  // Límites por defecto
  const defaultLimits = {
    [USER_ROLES.ADMIN]: { requests: 1000, window: 60000 },    // 1000 req/min
    [USER_ROLES.PREMIUM]: { requests: 500, window: 60000 },   // 500 req/min
    [USER_ROLES.USER]: { requests: 100, window: 60000 },      // 100 req/min
    [USER_ROLES.GUEST]: { requests: 20, window: 60000 }       // 20 req/min
  };
  
  const mergedLimits = { ...defaultLimits, ...limits };
  
  return (req, res, next) => {
    const userId = req.user?._id?.toString() || req.ip;
    const userRole = req.user?.role || USER_ROLES.GUEST;
    const limit = mergedLimits[userRole];
    
    const key = `${userId}:${userRole}`;
    const now = Date.now();
    
    // Obtener o crear registro de rate limit
    let userLimit = rateLimitStore.get(key);
    
    if (!userLimit || now - userLimit.resetTime > limit.window) {
      // Resetear contador
      userLimit = {
        count: 0,
        resetTime: now
      };
    }
    
    userLimit.count++;
    rateLimitStore.set(key, userLimit);
    
    // Agregar headers de rate limit
    res.setHeader('X-RateLimit-Limit', limit.requests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.requests - userLimit.count));
    res.setHeader('X-RateLimit-Reset', new Date(userLimit.resetTime + limit.window).toISOString());
    
    if (userLimit.count > limit.requests) {
      console.log('⚠️ [RateLimit] Límite excedido para:', userRole, userId);
      return res.status(429).json({
        status: 'error',
        message: 'Demasiadas solicitudes. Por favor intenta más tarde.',
        retryAfter: Math.ceil((userLimit.resetTime + limit.window - now) / 1000)
      });
    }
    
    next();
  };
}

/**
 * Limpiar rate limit store periódicamente
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.resetTime > 3600000) { // 1 hora
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Cada 5 minutos

export default {
  hasPermission,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  requireOwnershipOrAdmin,
  requireOwnership,
  requirePremium,
  isOwner,
  isAdmin,
  isPremiumOrAdmin,
  rolBasedRateLimit
};