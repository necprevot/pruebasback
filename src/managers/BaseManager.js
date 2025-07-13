// src/managers/BaseManager.js
import fs from 'fs';
import path from 'path';

export class BaseManager {
    constructor(filePath) {
        this.path = filePath;
        this.ensureFileExists();
    }

    ensureFileExists() {
        if (!fs.existsSync(this.path)) {
            const dir = path.dirname(this.path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.path, JSON.stringify([], null, 2));
        }
    }

    async readFile() {
        try {
            const data = await fs.promises.readFile(this.path, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading file ${this.path}:`, error);
            return [];
        }
    }

    async writeFile(data) {
        try {
            await fs.promises.writeFile(this.path, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`Error writing file ${this.path}:`, error);
            throw error;
        }
    }

    async getAll() {
        return await this.readFile();
    }

    async getById(id) {
        const items = await this.readFile();
        return items.find(item => item.id === parseInt(id));
    }

    async create(itemData) {
        const items = await this.readFile();
        const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
        const newItem = { id: newId, ...itemData };
        items.push(newItem);
        await this.writeFile(items);
        return newItem;
    }

    async update(id, updateData) {
        const items = await this.readFile();
        const index = items.findIndex(item => item.id === parseInt(id));
        if (index === -1) return null;
        
        items[index] = { ...items[index], ...updateData };
        await this.writeFile(items);
        return items[index];
    }

    async delete(id) {
        const items = await this.readFile();
        const index = items.findIndex(item => item.id === parseInt(id));
        if (index === -1) return null;
        
        const deletedItem = items[index];
        items.splice(index, 1);
        await this.writeFile(items);
        return deletedItem;
    }
}