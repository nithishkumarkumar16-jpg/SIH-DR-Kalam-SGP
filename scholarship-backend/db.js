const mongoose = require("mongoose");

let isConnected = false;

async function connectDB(uri) {
  const mongoURI = uri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sgp_scholarship";
  if (isConnected) return mongoose.connection;

  try {
    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`MongoDB Connected successfully to: ${conn.connection.name} (${conn.connection.host}:${conn.connection.port})`);
    return conn.connection;
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    throw error;
  }
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("MongoDB connection disconnected.");
});

module.exports = { connectDB, mongoose };
