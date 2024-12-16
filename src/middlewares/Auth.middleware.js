import jwt from "jsonwebtoken"
import { User } from "../models/User.model.js"
import { asyncHandler } from "../utils/AsyncHandler.js"
import { ApiError } from "../utils/ApiError.js"



const verifyJwt = asyncHandler( async (req, res, next) => {
    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!token){
            throw new ApiError(401, "Unauthorize Request");
            
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "invalid token access");
            
        }

        req.user = user
        next()

    } catch (error) {
        throw new ApiError(404, error?.message || "invalid access toke ")
    }
})

export {verifyJwt}