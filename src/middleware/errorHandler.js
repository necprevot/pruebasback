export const globalErrorHandler = (error, req, res, next) => {
    console.error('💥 Error global:', error.stack);
    
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
    });
};

export const notFoundHandler = (req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.originalUrl 
    });
};