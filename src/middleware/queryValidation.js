export const validateProductQuery = (req, res, next) => {
    try {
        const query = req.query;

        // Validar y sanitizar page
        if (query.page) {
            const page = parseInt(query.page);
            if (isNaN(page) || page < 1) {
                query.page = 1;
            } else {
                query.page = Math.min(page, 1000); // Máximo 1000 páginas
            }
        }

        // Validar y sanitizar limit
        if (query.limit) {
            const limit = parseInt(query.limit);
            if (isNaN(limit) || limit < 1) {
                query.limit = 10;
            } else {
                query.limit = Math.min(limit, 100); // Máximo 100 items por página
            }
        }

        // Validar sort
        if (query.sort) {
            const validSorts = [
                'price_asc', 'price_desc', 'title_asc', 'title_desc', 
                'stock_asc', 'stock_desc', 'newest', 'oldest', 'category_asc'
            ];
            if (!validSorts.includes(query.sort)) {
                delete query.sort;
            }
        }

        // Validar availability
        if (query.availability) {
            const validAvailability = ['available', 'outOfStock', 'lowStock', 'all'];
            if (!validAvailability.includes(query.availability)) {
                query.availability = 'all';
            }
        }

        // Validar y sanitizar precios
        if (query.minPrice) {
            const minPrice = parseFloat(query.minPrice);
            if (isNaN(minPrice) || minPrice < 0) {
                delete query.minPrice;
            } else {
                query.minPrice = minPrice;
            }
        }

        if (query.maxPrice) {
            const maxPrice = parseFloat(query.maxPrice);
            if (isNaN(maxPrice) || maxPrice < 0) {
                delete query.maxPrice;
            } else {
                query.maxPrice = maxPrice;
            }
        }

        // Validar que minPrice <= maxPrice
        if (query.minPrice && query.maxPrice && query.minPrice > query.maxPrice) {
            delete query.minPrice;
            delete query.maxPrice;
        }

        // Sanitizar búsqueda
        if (query.search) {
            query.search = query.search.toString().trim().substring(0, 100); // Max 100 caracteres
            if (query.search.length === 0) {
                delete query.search;
            }
        }

        // Sanitizar categoría
        if (query.category) {
            query.category = query.category.toString().trim().substring(0, 50);
            if (query.category.length === 0 || query.category === 'all') {
                delete query.category;
            }
        }

        req.query = query;
        next();

    } catch (error) {
        console.error('Error en validación de query:', error);
        // En caso de error, usar valores por defecto
        req.query = {
            page: 1,
            limit: 10
        };
        next();
    }
};

export const validateCartParams = (req, res, next) => {
    try {
        const { cid, pid } = req.params;

        // Validar formato ObjectId
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;

        if (cid && !objectIdRegex.test(cid)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de carrito inválido'
            });
        }

        if (pid && !objectIdRegex.test(pid)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de producto inválido'
            });
        }

        // Validar quantity en body si existe
        if (req.body.quantity !== undefined) {
            const quantity = parseInt(req.body.quantity);
            if (isNaN(quantity) || quantity < 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'La cantidad debe ser un número positivo'
                });
            }
            req.body.quantity = quantity;
        }

        next();

    } catch (error) {
        console.error('Error en validación de parámetros de carrito:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor'
        });
    }
};