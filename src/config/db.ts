import mongoose from "mongoose";
import conf from "./conf";

const connectDB = async () => {
    try {
        await mongoose.connect(conf.mongoUri || 'http://localhost:8080', {dbName: conf.mongodb});
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB