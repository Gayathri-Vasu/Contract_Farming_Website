const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Ensure JWT secret exists for local development
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = 'dev-secret-key-change-me';
  console.warn('⚠️  JWT_SECRET was missing; using an insecure development default. Set JWT_SECRET in backend/.env');
}

// Import routes
const authRoutes = require('./routes/auth');
const cropRoutes = require('./routes/crops');
const contractRoutes = require('./routes/contracts');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const marketplaceRoutes = require('./routes/marketplace');
const messagesRoutes = require('./routes/messages');
const suggestionRoutes = require('./routes/suggestions');
const productsRoutes = require('./routes/products');
const digiContractRoutes = require('./routes/digicontracts');
const marketPricesRoutes = require('./routes/marketPrices');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded avatar images
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// Database connection
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contract-farming';
  
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log(`Connection string: ${mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (err) {
    console.error('\n❌ MongoDB connection error!');
    console.error('Error details:', err.message);
    
    if (err.message.includes('ECONNREFUSED')) {
      console.error('\n🔧 MongoDB is not running!');
      console.error('\nTo start MongoDB:');
      console.error('  Windows: net start MongoDB');
      console.error('  Mac/Linux: sudo systemctl start mongod');
      console.error('\nOr use MongoDB Atlas (cloud):');
      console.error('  1. Sign up at https://www.mongodb.com/cloud/atlas');
      console.error('  2. Create free cluster');
      console.error('  3. Update MONGODB_URI in .env file');
      console.error('\nSee MONGODB_SETUP.md for detailed instructions');
    } else if (err.message.includes('authentication failed')) {
      console.error('\n🔧 Authentication failed!');
      console.error('Check your MongoDB username and password in .env file');
    } else if (err.message.includes('timeout')) {
      console.error('\n🔧 Connection timeout!');
      console.error('Check if MongoDB is running and accessible');
    }
    
    console.error('\n⚠️  Server will continue but database operations will fail');
    console.error('Please fix MongoDB connection and restart the server\n');
    
    // Don't exit - let server start but show warnings
    // process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/digicontracts', digiContractRoutes);
app.use('/api/digicontract', digiContractRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/market-prices', marketPricesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

