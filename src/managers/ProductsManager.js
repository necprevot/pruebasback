// src/managers/ProductsManager.js
import { BaseManager } from './BaseManager.js';

export class ProductsManager extends BaseManager {
    constructor() {
        super('./src/data/products.json');
    }

    async create(productData) {
        // Validaciones específicas para productos
        if (!productData.title || !productData.price || !productData.code) {
            throw new Error('Title, price, and code are required');
        }

        const products = await this.readFile();
        const codeExists = products.some(product => product.code === productData.code);
        if (codeExists) {
            throw new Error('Product code already exists');
        }

        const newProduct = {
            ...productData,
            status: productData.status !== undefined ? productData.status : true,
            thumbnails: productData.thumbnails || []
        };

        return await super.create(newProduct);
    }

    async update(id, updateData) {
        // No permitir actualizar el ID
        if (updateData.id) {
            delete updateData.id;
        }

        // Validar que el código no esté duplicado si se está actualizando
        if (updateData.code) {
            const products = await this.readFile();
            const codeExists = products.some(product => 
                product.code === updateData.code && product.id !== parseInt(id)
            );
            if (codeExists) {
                throw new Error('Product code already exists');
            }
        }

        return await super.update(id, updateData);
    }
}
