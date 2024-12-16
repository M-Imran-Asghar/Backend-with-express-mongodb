import mongoose from "mongoose";
// import { DB_NAME } from "../constants";

const connectDB = async () => {
    try {
        const connectionInstanceDB = await mongoose.connect(`${process.env.MONGODB_URI} `)
        console.log(`mongoDB connect successfully`);
        
    } catch (error) {
        console.log("mongoDB not connected", error);
        process.exit(1)
    }
}
export default connectDB