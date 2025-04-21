const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// MongoDB connection URI
const connectionURL = "mongodb://localhost:27017";

// Function to connect to MongoDB
async function connectToMongoDB(databaseName, collectionName) {
    try {
        const client = new MongoClient(connectionURL);
        
        // Connect to MongoDB
        await client.connect();
        
        // Access database and collection
        const database = client.db(databaseName);
        const collection = database.collection(collectionName);
        
        return collection;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

// Export function
module.exports = { connectToMongoDB };
