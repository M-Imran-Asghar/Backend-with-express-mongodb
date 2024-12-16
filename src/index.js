import connectDB from "./db/db.index.js";
import { app } from "./app.js";
import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`server is runing at port: ${process.env.PORT}`);
        
    })
})
.catch((err)=> {
    console.log("mongoDB runing Failed", err);
    
})