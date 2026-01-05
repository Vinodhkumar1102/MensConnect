const mongoose = require('mongoose');

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

const connectDB = async (retryCount = 0) => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    await mongoose.connect(uri, options);
    
    isConnected = true;
    connectionAttempts++;
    
    console.log('✅ MongoDB connected successfully');
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to DB');
      isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('🔴 Mongoose connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from DB');
      isConnected = false;
      
      // Attempt reconnection
      if (connectionAttempts < MAX_RETRIES) {
        console.log(`🔄 Attempting reconnection (${connectionAttempts + 1}/${MAX_RETRIES})...`);
        setTimeout(() => connectDB(connectionAttempts + 1), 5000);
      }
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ MongoDB connection attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      console.log(`⏳ Retrying in ${delay}ms...`);
      setTimeout(() => connectDB(retryCount + 1), delay);
    } else {
      console.warn('⚠️  Max connection retries reached. Continuing without MongoDB.');
      isConnected = false;
    }
  }
};

// Helper to check connection state
const checkConnection = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

// Get connection status
const getConnectionStatus = () => ({
  isConnected: checkConnection(),
  readyState: mongoose.connection ? mongoose.connection.readyState : 0,
  host: mongoose.connection ? mongoose.connection.host : 'unknown',
  name: mongoose.connection ? mongoose.connection.name : 'unknown',
});

module.exports = connectDB;
module.exports.isConnected = checkConnection;
module.exports.getConnectionStatus = getConnectionStatus;