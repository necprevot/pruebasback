import express from 'express';
import path from 'path';

export const configureExpress = (app) => {
    // Middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('public'));
    
    return app;
};