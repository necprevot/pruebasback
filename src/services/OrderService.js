/**
 * OrderService - Lógica de negocio para órdenes (VERSIÓN COMPLETA)
 * Maneja toda la lógica de creación y gestión de órdenes
 */

import Order from '../models/Order.js';
import CartDAO from '../dao/CartDAO.js';
import UserDAO from '../dao/UserDAO.js';
import Product from '../models/Product.js';
import emailService from './EmailService.js';
import {
  NotFoundError,
  BusinessError,
  InsufficientStockError,
  OrderError
} from '../utils/CustomErrors.js';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  LIMITS,
  ERROR_MESSAGES,
  SYSTEM_EVENTS
} from '../config/constants.js';
import mongoose from 'mongoose';

class OrderService {
  constructor() {
    this.cartDAO = new CartDAO();
    this.userDAO = new UserDAO();
    console.log('📦 [OrderService] Servicio de órdenes inicializado');
  }

  /**
   * Crear orden desde carrito
   * LÓGICA DE COMPRA COMPLETA CON VERIFICACIÓN DE STOCK
   */
  async createOrderFromCart(userId, shippingAddress, paymentMethod, notes = '') {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log('🛒 [OrderService] Creando orden para usuario:', userId);

      // 1. Obtener usuario y su carrito
      const user = await this.userDAO.findById(userId, 'cart');
      if (!user || !user.cart) {
        throw new NotFoundError('Carrito', user?.cart);
      }

      // 2. Obtener carrito completo con productos
      const cart = await this.cartDAO.getCartWithProducts(user.cart);
      
      if (!cart.products || cart.products.length === 0) {
        throw new BusinessError(ERROR_MESSAGES.CART_EMPTY);
      }

      // 3. Validar límites
      const totalItems = cart.products.reduce((sum, item) => sum + item.quantity, 0);
      if (totalItems > LIMITS.MAX_CART_ITEMS) {
        throw new BusinessError(`El carrito excede el límite de ${LIMITS.MAX_CART_ITEMS} items`);
      }

      // 4. Preparar items y VERIFICAR STOCK
      const orderItems = [];
      const unavailableProducts = [];
      let subtotal = 0;

      for (const cartItem of cart.products) {
        const product = await Product.findById(cartItem.product._id).session(session);
        
        if (!product) {
          unavailableProducts.push({
            id: cartItem.product._id,
            reason: 'Producto no encontrado'
          });
          continue;
        }

        // ✅ VERIFICAR STOCK DISPONIBLE
        if (!product.status) {
          unavailableProducts.push({
            id: product._id,
            name: product.title,
            reason: 'Producto inactivo'
          });
          continue;
        }

        if (product.stock < cartItem.quantity) {
          unavailableProducts.push({
            id: product._id,
            name: product.title,
            requested: cartItem.quantity,
            available: product.stock,
            reason: 'Stock insuficiente'
          });
          continue;
        }

        // ✅ Producto disponible - agregar a la orden
        const itemSubtotal = product.price * cartItem.quantity;
        
        orderItems.push({
          product: product._id,
          productSnapshot: {
            title: product.title,
            price: product.price,
            code: product.code,
            thumbnails: product.thumbnails || []
          },
          quantity: cartItem.quantity,
          price: product.price,
          subtotal: itemSubtotal
        });

        subtotal += itemSubtotal;

        // ✅ DESCONTAR STOCK
        product.stock -= cartItem.quantity;
        await product.save({ session });
        
        console.log(`✅ Stock actualizado para ${product.title}: ${product.stock + cartItem.quantity} -> ${product.stock}`);
      }

      // 5. Verificar si hay productos disponibles
      if (orderItems.length === 0) {
        await session.abortTransaction();
        throw new BusinessError(
          'No se pudo procesar ningún producto. ' + 
          unavailableProducts.map(p => p.reason).join(', ')
        );
      }

      // 6. Si hay productos no disponibles, informar pero continuar con los disponibles
      if (unavailableProducts.length > 0) {
        console.log('⚠️ [OrderService] Productos no disponibles:', unavailableProducts);
        // Aquí podrías enviar un email al usuario informando de los productos no procesados
      }

      // 7. Calcular totales
      const discount = 0; // Implementar lógica de descuentos aquí
      const shipping = subtotal >= LIMITS.FREE_SHIPPING_AMOUNT ? 0 : 5000;
      const tax = Math.round((subtotal - discount) * 0.19); // IVA 19%
      const total = subtotal - discount + shipping + tax;

      // 8. Validar monto mínimo
      if (total < LIMITS.MIN_ORDER_AMOUNT) {
        await session.abortTransaction();
        throw new BusinessError(`El monto mínimo de orden es $${LIMITS.MIN_ORDER_AMOUNT}`);
      }

      // 9. Crear la orden
      const order = new Order({
        user: userId,
        items: orderItems,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        shippingAddress,
        payment: {
          method: paymentMethod,
          status: PAYMENT_STATUS.PENDING
        },
        notes
      });

      await order.save({ session });

      // 10. Limpiar carrito de productos procesados
      const processedProductIds = orderItems.map(item => item.product.toString());
      cart.products = cart.products.filter(
        item => !processedProductIds.includes(item.product._id.toString())
      );
      await cart.save({ session });

      // 11. Commit de la transacción
      await session.commitTransaction();
      
      console.log('✅ [OrderService] Orden creada exitosamente:', order.orderNumber);

      // 12. Enviar email de confirmación (sin bloquear la respuesta)
      this.sendOrderConfirmationEmail(user.email, user.first_name, order)
        .catch(err => console.error('Error enviando email de confirmación:', err));

      // 13. Retornar orden con información de productos no disponibles si los hay
      return {
        order,
        unavailableProducts: unavailableProducts.length > 0 ? unavailableProducts : null
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ [OrderService] Error creando orden:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(orderId, userId, userRole) {
    try {
      const order = await Order.findById(orderId)
        .populate('user', 'first_name last_name email')
        .populate('items.product', 'title code category');

      if (!order) {
        throw new NotFoundError('Orden', orderId);
      }

      // Verificar autorización
      if (userRole !== 'admin' && order.user._id.toString() !== userId.toString()) {
        throw new Error('No tienes permiso para ver esta orden');
      }

      return order;
    } catch (error) {
      console.error('❌ [OrderService] Error obteniendo orden:', error);
      throw error;
    }
  }

  /**
   * Obtener órdenes del usuario
   */
  async getUserOrders(userId, page = 1, limit = 10, status = null) {
    try {
      const filter = { user: userId };
      if (status) {
        filter.status = status;
      }

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('items.product', 'title code'),
        Order.countDocuments(filter)
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ [OrderService] Error obteniendo órdenes:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las órdenes (Admin)
   */
  async getAllOrders(filters = {}, page = 1, limit = 20) {
    try {
      const query = {};

      if (filters.status) query.status = filters.status;
      if (filters.userId) query.user = filters.userId;
      if (filters.paymentStatus) query['payment.status'] = filters.paymentStatus;
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'first_name last_name email'),
        Order.countDocuments(query)
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ [OrderService] Error obteniendo todas las órdenes:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de orden
   */
  async updateOrderStatus(orderId, newStatus, notes, updatedBy) {
    try {
      const order = await Order.findById(orderId).populate('user', 'first_name email');
      
      if (!order) {
        throw new NotFoundError('Orden', orderId);
      }

      order.updateStatus(newStatus, notes, updatedBy);
      await order.save();

      // Enviar email según el nuevo estado
      if (newStatus === ORDER_STATUS.SHIPPED) {
        this.sendOrderShippedEmail(order.user.email, order.user.first_name, order)
          .catch(err => console.error('Error enviando email:', err));
      } else if (newStatus === ORDER_STATUS.DELIVERED) {
        this.sendOrderDeliveredEmail(order.user.email, order.user.first_name, order)
          .catch(err => console.error('Error enviando email:', err));
      }

      return order;
    } catch (error) {
      console.error('❌ [OrderService] Error actualizando estado:', error);
      throw error;
    }
  }

  /**
   * Confirmar pago
   */
  async confirmPayment(orderId, transactionId, paymentDetails = null) {
    try {
      const order = await Order.findById(orderId).populate('user', 'first_name email');
      
      if (!order) {
        throw new NotFoundError('Orden', orderId);
      }

      order.confirmPayment(transactionId, paymentDetails);
      await order.save();

      // Enviar email de confirmación de pago
      this.sendPaymentConfirmationEmail(order.user.email, order.user.first_name, order)
        .catch(err => console.error('Error enviando email:', err));

      return order;
    } catch (error) {
      console.error('❌ [OrderService] Error confirmando pago:', error);
      throw error;
    }
  }

  /**
   * Cancelar orden
   */
  async cancelOrder(orderId, reason, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId)
        .populate('user', 'first_name email')
        .session(session);
      
      if (!order) {
        throw new NotFoundError('Orden', orderId);
      }

      // Cancelar orden
      order.cancel(reason, userId);
      await order.save({ session });

      // ✅ RESTAURAR STOCK de los productos
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (product) {
          product.stock += item.quantity;
          await product.save({ session });
          console.log(`✅ Stock restaurado para ${product.title}: ${product.stock - item.quantity} -> ${product.stock}`);
        }
      }

      await session.commitTransaction();

      // Enviar email de cancelación
      this.sendOrderCancelledEmail(order.user.email, order.user.first_name, order, reason)
        .catch(err => console.error('Error enviando email:', err));

      return order;
    } catch (error) {
      await session.abortTransaction();
      console.error('❌ [OrderService] Error cancelando orden:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Obtener estadísticas de órdenes
   */
  async getOrderStats(startDate = null, endDate = null) {
    try {
      const match = {};
      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }

      const stats = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.PENDING] }, 1, 0] }
            },
            processingOrders: {
              $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.PROCESSING] }, 1, 0] }
            },
            shippedOrders: {
              $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.SHIPPED] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.CANCELLED] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0
      };
    } catch (error) {
      console.error('❌ [OrderService] Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS DE EMAIL (Delegados a EmailService)
  // ==========================================

  async sendOrderConfirmationEmail(email, firstName, order) {
    return await emailService.sendOrderConfirmationEmail(email, firstName, order);
  }

  async sendOrderShippedEmail(email, firstName, order) {
    return await emailService.sendOrderShippedEmail(email, firstName, order);
  }

  async sendOrderDeliveredEmail(email, firstName, order) {
    return await emailService.sendOrderDeliveredEmail(email, firstName, order);
  }

  async sendOrderCancelledEmail(email, firstName, order, reason) {
    return await emailService.sendOrderCancelledEmail(email, firstName, order, reason);
  }

  async sendPaymentConfirmationEmail(email, firstName, order) {
    return await emailService.sendPaymentConfirmationEmail(email, firstName, order);
  }
}

export default OrderService;