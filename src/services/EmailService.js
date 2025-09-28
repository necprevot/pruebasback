import { getEmailTransporter, emailConfig, verifyEmailConnection } from '../config/nodemailer.js';

class EmailService {
    constructor() {
        this.transporter = null;
        this.isEmailEnabled = false;
    }

    async initialize() {
        try {
            console.log('📧 [EmailService] Inicializando servicio de email...');
            
            this.isEmailEnabled = await verifyEmailConnection();
            
            if (this.isEmailEnabled) {
                this.transporter = getEmailTransporter();
                console.log('✅ [EmailService] Servicio de email inicializado correctamente');
            } else {
                console.log('⚠️ [EmailService] Servicio de email deshabilitado');
            }
            
            return this.isEmailEnabled;
        } catch (error) {
            console.error('❌ [EmailService] Error inicializando:', error.message);
            this.isEmailEnabled = false;
            return false;
        }
    }

    async sendWelcomeEmail(userEmail, userName) {
        if (!this.isEmailEnabled) {
            console.log('📧 Email deshabilitado - simulando envío de bienvenida');
            return { success: true, simulated: true };
        }

        try {
            const mailOptions = {
                from: emailConfig.from,
                to: userEmail,
                subject: `¡Bienvenido a ${emailConfig.company}!`,
                html: `
                    <h1>¡Hola ${userName}!</h1>
                    <p>Bienvenido a BBFermentos, tu tienda de productos fermentados.</p>
                    <p>Gracias por registrarte. ¡Esperamos que disfrutes nuestros productos!</p>
                    <hr>
                    <p><small>Equipo de ${emailConfig.company}</small></p>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ [EmailService] Email de bienvenida enviado:', result.messageId);
            
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ [EmailService] Error enviando email de bienvenida:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendPasswordResetEmail(userEmail, resetToken) {
        if (!this.isEmailEnabled) {
            console.log('📧 Email deshabilitado - simulando envío de reset');
            return { success: true, simulated: true };
        }

        try {
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;
            
            const mailOptions = {
                from: emailConfig.from,
                to: userEmail,
                subject: 'Restablecer contraseña - BBFermentos',
                html: `
                    <h1>Restablecer Contraseña</h1>
                    <p>Has solicitado restablecer tu contraseña.</p>
                    <p><a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
                    <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
                    <p><small>El enlace expira en 1 hora.</small></p>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ [EmailService] Email de reset enviado:', result.messageId);
            
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ [EmailService] Error enviando email de reset:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendTestEmail(toEmail) {
        if (!this.isEmailEnabled) {
            return { success: false, error: 'Servicio de email no configurado' };
        }

        try {
            const mailOptions = {
                from: emailConfig.from,
                to: toEmail,
                subject: 'Test Email - BBFermentos',
                html: `
                    <h1>🧪 Email de Prueba</h1>
                    <p>Este es un email de prueba desde BBFermentos.</p>
                    <p>Fecha: ${new Date().toLocaleString()}</p>
                    <p>Si recibes este email, la configuración está funcionando correctamente.</p>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ [EmailService] Email de prueba enviado:', result.messageId);
            
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ [EmailService] Error enviando email de prueba:', error.message);
            return { success: false, error: error.message };
        }
    }
}

export default EmailService;
