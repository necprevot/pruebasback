import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('📧 [Nodemailer] Inicializando configuración de email...');

// Función para crear el transporter según el proveedor
const createTransporter = () => {
    const provider = process.env.EMAIL_PROVIDER || 'gmail';
    
    console.log('📧 [Nodemailer] Proveedor configurado:', provider);
    
    switch (provider.toLowerCase()) {
        case 'gmail':
            return createGmailTransporter();
        case 'outlook':
            return createOutlookTransporter();
        case 'yahoo':
            return createYahooTransporter();
        case 'mailtrap':
            return createMailtrapTransporter();
        case 'sendgrid':
            return createSendgridTransporter();
        default:
            console.log('⚠️ [Nodemailer] Proveedor no reconocido, usando Gmail por defecto');
            return createGmailTransporter();
    }
};

// Gmail transporter
const createGmailTransporter = () => {
    console.log('📧 [Nodemailer] Configurando Gmail...');
    
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_APP_PASSWORD;
    
    if (!user || !pass) {
        console.error('❌ [Nodemailer] Faltan credenciales de Gmail');
        console.log('💡 [Nodemailer] Configura EMAIL_USER y EMAIL_APP_PASSWORD');
        return null;
    }
    
    return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Outlook transporter
const createOutlookTransporter = () => {
    console.log('📧 [Nodemailer] Configurando Outlook...');
    
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;
    
    if (!user || !pass) {
        console.error('❌ [Nodemailer] Faltan credenciales de Outlook');
        return null;
    }
    
    return nodemailer.createTransporter({
        service: 'hotmail',
        auth: {
            user: user,
            pass: pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Yahoo transporter
const createYahooTransporter = () => {
    console.log('📧 [Nodemailer] Configurando Yahoo...');
    
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_APP_PASSWORD;
    
    if (!user || !pass) {
        console.error('❌ [Nodemailer] Faltan credenciales de Yahoo');
        return null;
    }
    
    return nodemailer.createTransporter({
        service: 'yahoo',
        auth: {
            user: user,
            pass: pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Mailtrap transporter (para testing)
const createMailtrapTransporter = () => {
    console.log('📧 [Nodemailer] Configurando Mailtrap (Testing)...');
    
    const user = process.env.MAILTRAP_USER;
    const pass = process.env.MAILTRAP_PASS;
    
    if (!user || !pass) {
        console.error('❌ [Nodemailer] Faltan credenciales de Mailtrap');
        return null;
    }
    
    return nodemailer.createTransporter({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
            user: user,
            pass: pass
        }
    });
};

// SendGrid transporter
const createSendgridTransporter = () => {
    console.log('📧 [Nodemailer] Configurando SendGrid...');
    
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
        console.error('❌ [Nodemailer] Falta SENDGRID_API_KEY');
        return null;
    }
    
    return nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
            user: 'apikey',
            pass: apiKey
        }
    });
};

// Función para verificar la configuración
const verifyTransporter = async (transporter) => {
    if (!transporter) {
        console.error('❌ [Nodemailer] No se pudo crear el transporter');
        return false;
    }
    
    try {
        console.log('🔍 [Nodemailer] Verificando configuración...');
        await transporter.verify();
        console.log('✅ [Nodemailer] Configuración de email verificada correctamente');
        return true;
    } catch (error) {
        console.error('❌ [Nodemailer] Error en configuración:', error.message);
        return false;
    }
};

// Función para enviar email
const sendEmail = async (options) => {
    const transporter = createTransporter();
    
    if (!transporter) {
        throw new Error('No se pudo crear el transporter de email');
    }
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
    };
    
    try {
        console.log('📤 [Nodemailer] Enviando email a:', options.to);
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ [Nodemailer] Email enviado correctamente');
        return result;
    } catch (error) {
        console.error('❌ [Nodemailer] Error enviando email:', error.message);
        throw error;
    }
};

// Exportar configuración
const transporter = createTransporter();

export { transporter, sendEmail, verifyTransporter };
export default transporter;