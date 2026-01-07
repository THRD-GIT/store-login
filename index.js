// Enter IST time in the following variables
const year = 2026;
const month = 1;
const day = 10;

const hours = 18;
const minutes = 30;

// Calculate the UTC time by subtracting 5 hours and 30 minutes from IST
const ISTOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds

// Create a Date object with IST time
const storeOpensAtIST = new Date(year, month - 1, day, hours, minutes);

// Convert IST to UTC by subtracting the IST offset
const storeOpensAt = new Date(storeOpensAtIST.getTime() - ISTOffset);

const express = require('express');
const zod = require('zod');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv=require("dotenv")
dotenv.config()

const corsOptions = {
  origin: '*', 
  credentials: true, 
  optionSuccessStatus: 200,
}

// Use environment variable for MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI

const connectDB = async () => {
  try {
    // Add connection options for better reliability
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
    });

    console.log("MongoDB Connected:", conn.connection.host);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    // Don't exit the process immediately, let it retry
    setTimeout(() => {
      console.log('Retrying MongoDB connection...');
      connectDB();
    }, 5000);
  }
}

// Initialize MongoDB connection
connectDB();

const userSchemaMono = new mongoose.Schema({ Phone: String, password: String, loginTime: Array });
const User = mongoose.model('User', userSchemaMono);
const userLoginSchemaMono = new mongoose.Schema({ phone: String, time: Date });

const BlacklistedMember = mongoose.model('blacklistedMembers', new mongoose.Schema({ Phone: String, Name: String }));
const earlyAccessMember = mongoose.model('earlyaccessmember', new mongoose.Schema({ Phone: String, Name: String })); 
const removedMember = mongoose.model('removedusers', new mongoose.Schema({ phone: String }, { timestamps: true })); 
const UserLogin = mongoose.model('UserLogin', userLoginSchemaMono);

const userSchema = zod.object({
  phone: zod.string().refine((value) => /^\d{10}$/.test(value))
});

const app = express();


app.set('trust proxy', true); // Add this

// Helper function (add this)
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection.remoteAddress || req.ip || req.socket.remoteAddress;
}

// Blocked IPs array (add this)
const BLOCKED_IPS = [
  '2401:4900:88b7:5ccd:c1c:f04d:c54:fd4c'

];

// IP blocking middleware (add this)
const blockIPMiddleware = (req, res, next) => {
  const clientIP = getClientIP(req);
  if (BLOCKED_IPS.includes(clientIP)) {
    console.log(`Blocked request from IP: ${clientIP}`);
    return res.status(403).json({
      status: 'error',
      message: 'Access denied (IP blocked)',
      code: 403
    });
  }
  next();
};
app.use(express.static("public"));
app.use(cors(corsOptions));
app.use(express.json());

// Apply blocker here (global)
app.use(blockIPMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'ok',
    database: states[dbState] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Use environment variable for port
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

app.get('*', async (req, res) => {
  try {
    const currentTime = new Date();
    let timeToOpen = storeOpensAt - currentTime;
    const days = Math.floor(timeToOpen / (1000 * 60 * 60 * 24));
    timeToOpen %= (1000 * 60 * 60 * 24);
    const hours = Math.floor(timeToOpen / (1000 * 60 * 60));
    timeToOpen %= (1000 * 60 * 60);
    const minutes = Math.floor(timeToOpen / (1000 * 60));
    timeToOpen %= (1000 * 60);
    const seconds = Math.floor(timeToOpen / 1000);
    
    console.log(`Time until the store opens: ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds.`);

    res.json({
      StoreOpen: !(storeOpensAt > new Date()),
      storeOpensIn: `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds.`
    });
  } catch (error) {
    console.error('Error in root route:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    const clientIP = getClientIP(req); // Optional: Log IP here too
  console.log(`Login attempt from IP: ${clientIP} for phone: ${req.body.phone}`);
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'error',
        message: 'Database not connected',
        code: 6
      });
    }

    const response = userSchema.safeParse(req.body);
    if (!response.success) {
      console.log(response.error.issues[0].message);
      return res.json({
        status: "error",
        error: response.error.issues[0].message,
        code: 3
      });
    } 

    const phone = BigInt(req.body.phone);

    const removedusers = await removedMember.findOne({ phone: phone });
    if (removedusers) {
      return res.json({
        status: 'error',
        message: 'User Not Found',
        code: 2
      });
    }

    if (storeOpensAt > new Date()) {
      const earlyAccessUser = await earlyAccessMember.findOne({ Phone: phone });
      if (earlyAccessUser) {
        console.log("early access user", phone);
        return res.json({
          status: 'ok',
          message: 'Early Access User',
          code: 1,
          password: "revolution@123"
        });
      } else {
        console.log("not early access user", phone);
        return res.json({
          status: 'error',
          message: 'Not Early Access User',
          code: 5
        });
      }
    }

    const blacklistedUser = await BlacklistedMember.findOne({ Phone: phone });
    
    if (blacklistedUser) {
      console.log("blacklisted user", phone);
      return res.json({
        status: 'error',
        message: 'Blacklisted User',
        code: 4
      });
    }
    
    const user = await User.findOne({ Phone: phone });

    if (!user) {
      return res.json({
        status: 'error',
        message: 'User Not Found',
        code: 2
      });
    }

    const currentTime = new Date();
    user.loginTime.push(currentTime);
    await user.save();

    const newEntry = new UserLogin({ phone: phone, time: currentTime });
    await newEntry.save();

    console.log('Found User:', phone);
    
    res.json({
      status: 'ok',
      message: 'User logged in',
      code: 1,
      password: "revolution"
    });

  } catch (error) {
    console.error('Error in /api/data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 3
    });
  }
});

// Global error handler
app.use(function(err, req, res, next) {
  console.error('Global error:', err);
  res.status(500).json({
    msg: "global catch",
    error: err.message
  });
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});