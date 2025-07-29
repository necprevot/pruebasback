import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
  try {
    // ✅ Evitar múltiples conexiones
    if (isConnected) {
      console.log('🔄 Usando conexión existente a MongoDB');
      return;
    }

    // ✅ Verificar si ya hay una conexión activa
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB ya está conectado');
      isConnected = true;
      return;
    }

    console.log('🚀 Iniciando conexión a MongoDB...');
    
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }
    
    // Ocultar la contraseña para el log
    const safeUri = uri.replace(/:([^:@]+)@/, ':***@');
    console.log('🌐 URI (sin contraseña):', safeUri);
    
    console.log('⏳ Intentando conectar...');
    
    // ✅ Opciones optimizadas para desarrollo
    const options = {
      serverSelectionTimeoutMS: 5000, // Reducido a 5 segundos
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10, // ✅ Limitar pool de conexiones
      minPoolSize: 1,
      maxIdleTimeMS: 30000, // ✅ Cerrar conexiones inactivas
      bufferCommands: false, // ✅ Deshabilitar buffering en desarrollo
      bufferMaxEntries: 0
    };
    
    await mongoose.connect(uri, options);
    isConnected = true;
    
    console.log('✅ MongoDB Atlas conectado correctamente');
    
    // ✅ Event listeners optimizados (solo una vez)
    if (!mongoose.connection._eventsSet) {
      mongoose.connection.on('error', (error) => {
        console.error('❌ Error de conexión MongoDB:', error);
        isConnected = false;
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB desconectado');
        isConnected = false;
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconectado');
        isConnected = true;
      });
      
      // ✅ Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('🛑 Cerrando conexión a MongoDB...');
        await mongoose.connection.close();
        isConnected = false;
        process.exit(0);
      });
      
      // ✅ Marcar eventos como configurados
      mongoose.connection._eventsSet = true;
    }
    
  } catch (error) {
    console.error('💥 Error conectando a MongoDB:', error.message);
    isConnected = false;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Continuando sin conexión a base de datos en desarrollo...');
    } else {
      throw error; // En producción, fallar si no hay conexión
    }
  }
};

// ✅ Función para verificar estado de conexión
export const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    states: {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    }
  };
};

// ✅ Función para cerrar conexión manualmente
export const closeConnection = async () => {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('🔴 Conexión MongoDB cerrada manualmente');
  }
};

export default connectDB;