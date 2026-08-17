const mongoose = require('mongoose');

let isConnected = false;

const connectDatabase = async () => {
  if (isConnected) return mongoose.connection;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  const data = await mongoose.connect(process.env.MONGO_URI);
  isConnected = data.connections[0].readyState === 1;
  console.log(`MongoDB connected with server: ${data.connection.host}`);
  return data;
};

module.exports = connectDatabase;
