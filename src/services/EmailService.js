import nodemailer from 'nodemailer';

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
        console.log('📧 [EmailService] Servicio de email inicializado');
    }

    initializeTransporter() {
        try {
            console.log('📧 [EmailService] Configurando transportador Gmail...');
            
            if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
                console.log('⚠️ [EmailService] Variables EMAIL_USER o EMAIL_APP_PASSWORD no configuradas');
                return;
            }

            // CORREGIDO: usar nodemailer.createTransport (sin 'er' al final)
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_APP_PASSWORD
                }
            });

            console.log('✅ [EmailService] Transportador Gmail configurado');
            
        } catch (error) {
            console.error('❌ [EmailService] Error:', error.message);
        }
    }

    async verifyConnection() {
        if (!this.transporter) {
            console.log('❌ [EmailService] Transportador no disponible');
            return false;
        }

        try {
            console.log('🔍 [EmailService] Verificando conexión...');
            await this.transporter.verify();
            console.log('✅ [EmailService] Conexión verificada');
            return true;
        } catch (error) {
            console.error('❌ [EmailService] Error verificando:', error.message);
            return false;
        }
    }

    async sendTestEmail(toEmail) {
        if (!this.transporter) {
            return { success: false, message: 'Servicio no inicializado' };
        }

        try {
            console.log('📧 [EmailService] Enviando email de prueba a:', toEmail);
            
            const result = await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: toEmail,
                subject: '🧪 Prueba - BBFermentos',
                text: 'Email de prueba desde BBFermentos. ¡El sistema funciona!',
                html: '<h1>🧪 Prueba BBFermentos</h1><p>Email de prueba. ¡El sistema funciona!</p>'
            });

            console.log('✅ [EmailService] Email enviado:', result.messageId);
            return {
                success: true,
                messageId: result.messageId,
                message: 'Email enviado correctamente'
            };

        } catch (error) {
            console.error('❌ [EmailService] Error enviando:', error.message);
            return {
                success: false,
                message: 'Error: ' + error.message
            };
        }
    }

    async sendWelcomeEmail(userEmail, firstName, lastName) {
        if (!this.transporter) {
            return { success: false, message: 'Servicio no inicializado' };
        }

        try {
            console.log('📧 [EmailService] Enviando bienvenida a:', userEmail);
            
            const result = await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: userEmail,
                subject: '🎉 ¡Bienvenido a BBFermentos!',
                text: `¡Hola ${firstName} ${lastName}! Bienvenido a BBFermentos.`,
                html: `<h1>🎉 ¡Bienvenido ${firstName}!</h1><p>Tu cuenta en BBFermentos ha sido creada exitosamente.</p>`
            });

            console.log('✅ [EmailService] Bienvenida enviada:', result.messageId);
            return {
                success: true,
                messageId: result.messageId,
                message: 'Email de bienvenida enviado'
            };

        } catch (error) {
            console.error('❌ [EmailService] Error enviando bienvenida:', error.message);
            return {
                success: false,
                message: 'Error: ' + error.message
            };
        }
    }

    // NUEVO: Método para verificar configuración
    async verifyEmailConfiguration() {
        try {
            console.log('🔍 [EmailService] Verificando configuración de email...');
            
            const config = {
                hasEmailUser: !!process.env.EMAIL_USER,
                hasEmailPassword: !!process.env.EMAIL_APP_PASSWORD,
                emailUser: process.env.EMAIL_USER || 'No configurado',
                emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'No configurado',
                provider: 'gmail'
            };
            
            if (!config.hasEmailUser || !config.hasEmailPassword) {
                return {
                    success: false,
                    message: 'Configuración de email incompleta. Faltan EMAIL_USER o EMAIL_APP_PASSWORD',
                    ...config
                };
            }
            
            // Verificar conexión si está configurado
            const connectionTest = await this.verifyConnection();
            
            return {
                success: connectionTest,
                message: connectionTest ? 'Configuración de email válida' : 'Error de conexión con Gmail',
                ...config
            };
            
        } catch (error) {
            console.error('❌ [EmailService] Error verificando configuración:', error.message);
            return {
                success: false,
                message: 'Error verificando configuración: ' + error.message
            };
        }
    }
}

const emailService = new EmailService();
export default emailService;