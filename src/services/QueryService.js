class QueryService {
    constructor(model, queryString) {
        this.model = model;
        this.queryString = queryString;
        this.query = this.model.find();
    }

    // Filtros comunes
    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
        excludedFields.forEach(el => delete queryObj[el]);

        // Filtros avanzados (gte, gt, lte, lt)
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
        
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    // Búsqueda por texto
    search() {
        if (this.queryString.search) {
            const searchRegex = new RegExp(this.queryString.search, 'i');
            this.query = this.query.find({
                $or: [
                    { title: searchRegex },
                    { description: searchRegex },
                    { category: searchRegex }
                ]
            });
        }
        return this;
    }

    // Ordenamiento
    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    // Limitación de campos
    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v');
        }
        return this;
    }

    // Paginación
    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 10;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        
        // Almacenar para cálculos posteriores
        this.pagination = { page, limit, skip };
        return this;
    }

    // Ejecutar consulta con metadatos
    async execute() {
        // Clonar query para count
        const countQuery = this.query.model.find(this.query.getQuery());
        
        // Ejecutar ambas consultas en paralelo
        const [docs, totalDocs] = await Promise.all([
            this.query,
            countQuery.countDocuments()
        ]);

        // Calcular metadatos de paginación
        const { page, limit } = this.pagination || { page: 1, limit: 10 };
        const totalPages = Math.ceil(totalDocs / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            status: 'success',
            payload: docs,
            totalPages,
            prevPage: hasPrevPage ? page - 1 : null,
            nextPage: hasNextPage ? page + 1 : null,
            page,
            hasPrevPage,
            hasNextPage,
            totalDocs,
            limit
        };
    }
}

export default QueryService;