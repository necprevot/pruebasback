import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('🚀 Iniciando conexión a MongoDB...');
    
    const uri = process.env.MONGODB_URI;
    
    console.log('🔍 Verificando URI...');
    console.log('URI existe:', uri ? '✅ SÍ' : '❌ NO');
    
    if (!uri) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }
    
    // Ocultar la contraseña para el log
    const safeUri = uri.replace(/:([^:@]+)@/, ':***@');
    console.log('🌐 URI (sin contraseña):', safeUri);
    
    console.log('⏳ Intentando conectar...');
    
    // Agregar opciones de conexión con timeout
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 segundos timeout
      socketTimeoutMS: 45000,
      family: 4 
    };
    
    await mongoose.connect(uri, options);
    
    console.log('✅ MongoDB Atlas conectado correctamente');
    
    // Event listeners para debugging
    mongoose.connection.on('error', (error) => {
      console.error('❌ Error de conexión MongoDB:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB desconectado');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconectado');
    });
    
  } catch (error) {
    console.error('💥 Error conectando a MongoDB:', error.message);
    console.error('🔧 Detalles del error:', error);
    
    console.log('⚠️ Continuando sin conexión a base de datos...');
  }
};

export default connectDB;