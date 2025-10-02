
import BaseRepository from './BaseRepository.js';
import CartDAO from '../dao/CartDAO.js';

class CartRepository extends BaseRepository {
    constructor() {
        const cartDAO = new CartDAO();
        super(cartDAO);
    }

    /**
     * Crear carrito vacío
     */
    async createEmptyCart() {
        try {
            return await this.dao.createEmptyCart();
        } catch (error) {
            console.error('[CartRepository] Error creando carrito:', error.message);
            throw error;
        }
    }

    /**
     * Obtener carrito con productos populados
     */
    async getCartWithProducts(cartId) {
        try {
            return await this.dao.getCartWithProducts(cartId);
        } catch (error) {
            console.error('[CartRepository] Error obteniendo carrito:', error.message);
            throw error;
        }
    }

    /**
     * Agregar producto al carrito
     */
    async addProductToCart(cartId, productId, quantity = 1) {
        try {
            
            // Si usas CartManager en lugar de DAO directamente
            const CartManager = (await import('../managers/CartManager.js')).default;
            const cartManager = new CartManager();
            
            return await cartManager.addProductToCart(cartId, productId);
        } catch (error) {
            console.error(' [CartRepository] Error agregando producto:', error.message);
            throw error;
        }
    }

    /**
     * Actualizar cantidad de producto
     */
    async updateProductQuantity(cartId, productId, quantity) {
        try {           
            const CartManager = (await import('../managers/CartManager.js')).default;
            const cartManager = new CartManager();
            
            return await cartManager.updateProductQuantity(cartId, productId, quantity);
        } catch (error) {
            console.error(' [CartRepository] Error actualizando cantidad:', error.message);
            throw error;
        }
    }

    /**
     * Eliminar producto del carrito
     */
    async removeProductFromCart(cartId, productId) {
        try {
            
            const CartManager = (await import('../managers/CartManager.js')).default;
            const cartManager = new CartManager();
            
            return await cartManager.removeProductFromCart(cartId, productId);
        } catch (error) {
            console.error(' [CartRepository] Error eliminando producto:', error.message);
            throw error;
        }
    }

    /**
     * Vaciar carrito
     */
    async clearCart(cartId) {
        try {
            
            const CartManager = (await import('../managers/CartManager.js')).default;
            const cartManager = new CartManager();
            
            return await cartManager.clearCart(cartId);
        } catch (error) {
            console.error(' [CartRepository] Error vaciando carrito:', error.message);
            throw error;
        }
    }

    /**
     * Calcular total del carrito
     */
    async getCartTotal(cartId) {
        try {
            const cart = await this.getCartWithProducts(cartId);
            return await cart.calculateTotal();
        } catch (error) {
            console.error(' [CartRepository] Error calculando total:', error.message);
            throw error;
        }
    }
}

export default CartRepository;
