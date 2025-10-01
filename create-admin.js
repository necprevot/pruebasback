import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import connectDB from '../src/config/database.js';
import User from '../src/models/User.js';
import Cart from '../src/models/Cart.js';

dotenv.config();

async function createAdmin() {
    try {
        await connectDB();
        console.log('✅ Conectado a MongoDB');
        
        const adminEmail = 'admin@bbfermentos.com';
        
        // Verificar si el admin existe
        let admin = await User.findOne({ email: adminEmail });
        
        if (admin) {
            console.log('⚠️ Admin ya existe');
            console.log('📧 Email:', admin.email);
            console.log('👤 Nombre:', admin.first_name, admin.last_name);
            console.log('🔑 Role:', admin.role);
            
            // Actualizar rol si no es admin
            if (admin.role !== 'admin') {
                admin.role = 'admin';
                await admin.save();
                console.log('✅ Rol actualizado a admin');
            }
        } else {
            // Crear carrito para el admin
            const cart = new Cart({ products: [] });
            await cart.save();
            
            // Crear admin
            const hashedPassword = bcrypt.hashSync('Admin123!', 10);
            admin = await User.create({
                first_name: 'Admin',
                last_name: 'Sistema',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                cart: cart._id
            });
            
            console.log('✅ Admin creado exitosamente');
            console.log('📧 Email:', adminEmail);
            console.log('🔑 Password: Admin123!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createAdmin();