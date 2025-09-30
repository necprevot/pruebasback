/**
 * Router de Órdenes
 * Define todas las rutas relacionadas con órdenes de compra
 */

import { Router } from 'express';
import OrderController from '../controllers/OrderController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const orderController = new OrderController();

console.log('📦 [Orders Router] Configurando rutas de órdenes');

// ====================================
// RUTAS PROTEGIDAS PARA USUARIOS
// ====================================

/**
 * POST /api/orders
 * Crear orden desde carrito
 * REQUIERE: Autenticación (user o premium)
 */
router.post('/',
  authenticate,
  orderController.createOrder
);

/**
 * GET /api/orders/user/me
 * Obtener mis órdenes
 * REQUIERE: Autenticación
 */
router.get('/user/me',
  authenticate,
  orderController.getMyOrders
);

/**
 * GET /api/orders/:id
 * Obtener orden por ID (propia o admin)
 * REQUIERE: Autenticación
 */
router.get('/:id',
  authenticate,
  orderController.getOrderById
);

/**
 * POST /api/orders/:id/cancel
 * Cancelar orden (propia)
 * REQUIERE: Autenticación
 */
router.post('/:id/cancel',
  authenticate,
  orderController.cancelOrder
);

// ====================================
// RUTAS ADMINISTRATIVAS (SOLO ADMIN)
// ====================================

/**
 * GET /api/orders
 * Obtener todas las órdenes con filtros
 * REQUIERE: Admin
 */
router.get('/',
  authenticate,
  authorize('admin'),
  orderController.getAllOrders
);

/**
 * GET /api/orders/stats
 * Obtener estadísticas de órdenes
 * REQUIERE: Admin
 */
router.get('/stats',
  authenticate,
  authorize('admin'),
  orderController.getOrderStats
);

/**
 * PATCH /api/orders/:id/status
 * Actualizar estado de orden
 * REQUIERE: Admin
 */
router.patch('/:id/status',
  authenticate,
  authorize('admin'),
  orderController.updateOrderStatus
);

/**
 * POST /api/orders/:id/confirm-payment
 * Confirmar pago de orden
 * REQUIERE: Admin
 */
router.post('/:id/confirm-payment',
  authenticate,
  authorize('admin'),
  orderController.confirmPayment
);

/**
 * POST /api/orders/:id/tracking
 * Actualizar información de tracking
 * REQUIERE: Admin
 */
router.post('/:id/tracking',
  authenticate,
  authorize('admin'),
  orderController.updateTracking
);

console.log('✅ [Orders Router] Rutas configuradas:');
console.log('   🔐 POST   /api/orders                     - Usuario (crear orden)');
console.log('   🔐 GET    /api/orders/user/me             - Usuario (mis órdenes)');
console.log('   🔐 GET    /api/orders/:id                 - Usuario (ver orden)');
console.log('   🔐 POST   /api/orders/:id/cancel          - Usuario (cancelar)');
console.log('   👨‍💼 GET    /api/orders                     - Solo Admin (todas)');
console.log('   👨‍💼 GET    /api/orders/stats               - Solo Admin (estadísticas)');
console.log('   👨‍💼 PATCH  /api/orders/:id/status          - Solo Admin (estado)');
console.log('   👨‍💼 POST   /api/orders/:id/confirm-payment - Solo Admin (confirmar pago)');
console.log('   👨‍💼 POST   /api/orders/:id/tracking        - Solo Admin (tracking)');

export default router;