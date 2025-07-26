import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }
    
    await mongoose.connect(uri);
    
    console.log('✅ MongoDB Atlas conectado correctamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

export default connectDB;