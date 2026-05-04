const { MongoClient } = require('mongodb');
require("dotenv").config()


// Environment variables
const MONGO_URI = process.env.MONGODB_URI_STATS;

const DB = process.env.DB_STATS;

const COLLECTION = process.env.COLLECTION_STATS;

let client;
let Stats;

let isConnected = false;

// Initialize MongoDB connection
const connectDbStats = async () => {
    if (isConnected && client) {
        console.log('Reusing existing MongoDB connection');
        return;
    }

    try {
        // Validate environment variables

        const missingVars = [];
        if (!MONGO_URI) missingVars.push('MONGODB_URI_STATS');
        if (!DB) missingVars.push('DB_STATS');
       
        if (!COLLECTION) missingVars.push('COLLECTION_STATS');
       
        if (missingVars.length > 0) {
            console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        // Create client with robust options
        client = new MongoClient(MONGO_URI);
        // console.info("uri",MONGO_URI)

        // Connect to MongoDB
        await client.connect();
         console.log('Connected to MongoDB Stats ');


        // Initialize collections
        const db = client.db(DB);

        Stats = db.collection(COLLECTION);

  

        isConnected = true;

        // Handle connection errors and closures
        client.on('error', (err) => {
            console.error('connectDbStats connection error:'+ JSON.stringify(err,null,2));
            isConnected = false;
            client = null;
        });

        client.on('close', () => {
            console.log('connectDbStats connection closed');
            isConnected = false;
            client = null;
        });

    } catch (error) {
        console.error('Failed to connect to connectDbStats:'+ JSON.stringify(error,null,2));
        isConnected = false;
        client = null;
        return null;
    }
};

// Get client (for advanced use cases)
const getClient = async () => {
    if (!isConnected || !client) {
        await connectDbStats();
    }
    return client;
};

// Check connection status
const isDbConnected = () => isConnected;

// Export connection and collections with lazy initialization
module.exports = {
    connectDbStats,
    isDbConnected,
   
   
    getStatsDataCollection: async () => {
        await getClient();
        if (!Stats) console.error('Stats collection not initialized.');
        return Stats;
    },
   
    
   
    // Optional: Method to close the connection (use with caution)
    closeConnection: async () => {
        if (client && isConnected) {
            await client.close();
            isConnected = false;
            client = null;
            console.info('MongoDB connection closed');
        }
    },
};