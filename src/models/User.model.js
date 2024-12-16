import mongoose, {Schema} from "mongoose";
import bcrypt, { compare } from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        userName:{
            type: String,
            required: true,
            lowercase: true,
            index: true,
            trim: true,
            unique: true
        },
        fullName:{
            type: String,
            required: true,
            index: true,
            trim: true,
        },
        email:{
            type: String,
            required:[ true, "Email Must be Required"],
            lowercase: true,
            trim: true,
            unique: true
        },
        password:{
            type: String,
            required: [true, "Password is Required"]
        },
        avatar:{
            type:String,
            required:true,
        },
        coverImage:{
            type: String,
            
        },
        watchHistory:[
            {
                type:mongoose.Types.ObjectId,
                ref: "Video"
            }
        ],
        refreshToken:{
            type: String
        }
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            userName: this.userName,
            fullName: this.fullName,
            email: this.email
        }, 
        process.env.ACCESS_TOKEN,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        },
    )
    
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        }, 
        process.env.REFRESH_TOKEN,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        },
    )
    
}


export const User = mongoose.model("User", userSchema)