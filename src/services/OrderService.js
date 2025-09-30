/**
 * OrderService - Lógica de negocio para órdenes
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

      // 4. Preparar items de la orden y validar