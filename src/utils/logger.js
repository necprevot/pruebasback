export const logger = {
    info: (message) => {
        if (process.env.NODE_ENV !== 'production') {
        }
    },
    
    error: (message) => {
        console.error(` ${message}`);
    },
    
    success: (message) => {
        if (process.env.NODE_ENV !== 'production') {

        }
    }
};