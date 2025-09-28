import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del transportador de email
const createTransporter = () => {
    try {
        console.log('📧 Configurando Gmail para envío de emails...');
        
        return nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

    } catch (error) {
        console.error('❌ Error configurando transportador de email:', error.message);
        throw error;
    }
};

// Verificar conexión del transportador
export const verifyEmailConnection = async () => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️ Variables de email no configuradas - servicio deshabilitado');
            return false;
        }

        const transporter = createTransporter();
        await transporter.verify();
        
        console.log('✅ Conexión de email verificada correctamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error verificando conexión de email:', error.message);
        return false;
    }
};

export const getEmailTransporter = () => {
    return createTransporter();
};

export const emailConfig = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@bbfermentos.com',
    company: 'BBFermentos',
    supportEmail: process.env.EMAIL_USER || 'soporte@bbfermentos.com'
};

console.log('📧 Configuración de Nodemailer cargada');

export default {
    createTransporter,
    verifyEmailConnection,
    getEmailTransporter,
    emailConfig
};
