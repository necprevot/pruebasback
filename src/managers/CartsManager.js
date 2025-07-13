// src/managers/CartsManager.js
import { BaseManager } from './BaseManager.js';

export class CartsManager extends BaseManager {
    constructor() {
        super('./src/data/carts.json');
    }

    async create() {
        // Los carritos siempre se crean vacíos
        return await super.create({ products: [] });
    }

    async addProduct(cartId, productId) {
        const cart = await this.getById(cartId);
        if (!cart) {
            throw new Error('Cart not found');
        }

        const existingProduct = cart.products.find(p => p.product === parseInt(productId));
        
        if (existingProduct) {
            existingProduct.quantity += 1;
        } else {
            cart.products.push({ product: parseInt(productId), quantity: 1 });
        }

        return await this.update(cartId, cart);
    }

    async updateProductQuantity(cartId, productId, quantity) {
        const cart = await this.getById(cartId);
        if (!cart) {
            throw new Error('Cart not found');
        }

        const productIndex = cart.products.findIndex(p => p.product === parseInt(productId));
        if (productIndex === -1) {
            throw new Error('Product not found in cart');
        }

        if (quantity <= 0) {
            cart.products.splice(productIndex, 1);
        } else {
            cart.products[productIndex].quantity = quantity;
        }

        return await this.update(cartId, cart);
    }

    async removeProduct(cartId, productId) {
        const cart = await this.getById(cartId);
        if (!cart) {
            throw new Error('Cart not found');
        }

        cart.products = cart.products.filter(p => p.product !== parseInt(productId));
        return await this.update(cartId, cart);
    }

    async clearCart(cartId) {
        return await this.update(cartId, { products: [] });
    }
}