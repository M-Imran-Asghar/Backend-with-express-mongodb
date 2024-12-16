import { asyncHandler } from "../utils/AsyncHandler.js"
import {User } from "../models/User.model.js"
import {ApiError} from "../utils/ApiError.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"



// genrate access and refresf token

const genrateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while genrating access and refresh token");
        
    }
}

const registerUser = asyncHandler( async (req, res)=> {

    // register user steps
    // get user detail from frontend 
    // validate - not empty
    // check if user alreafdy exits
    // check fro images or check for avatar 
    // upload images on cloudinary
    // create user object --- create entry in db
    // remove password and refresh token field from  response
    // check for user creation
    // return res 

    const {fullName, userName, email, password} = req.body
    
    if(
        [userName, fullName, email, password].some((field)=> field?.trim === "")
    ){
        throw new ApiError(400, "All field required")
    }
    const exitedUser = await User.findOne({
      $or:  [{userName}, {email}]
    })
    if (exitedUser) {
        throw new ApiError(409, "User Already Exist");
        
    }

    
    let localCoverImagePath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        localCoverImagePath = req.files?.coverImage[0]?.path
    }
    const coverImage = await uploadOnCloudinary(localCoverImagePath)
    
    const localAvatarPath = req.files?.avatar[0]?.path
    if(!localAvatarPath){
        throw new ApiError(400, "avatar local path erro");
        
    }
    const avatar = await uploadOnCloudinary(localAvatarPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
        
    }


    const user = await User.create({
        fullName,
        userName: userName.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new ApiError(500, "SomeThing wrong in User field");
        
    }

    return res.status(201).json(
        new ApiResponse(200, "User Created successfully")
    )




})

const loginUser = asyncHandler( async (req, res)=> {
    // Login steps
    // req body -> for data
    // find user
    // validate user
    // validate password
    // access and refresf token
    // send cokie 
    

    const { userName, email,  password} = req.body

    if(!userName && !email){
        throw new ApiError(400,"username and email is required");        
    }

    const user = await User.findOne({
        $or: [{userName}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user does not exit");        
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Enter valid Password");        
    }


    const { accessToken, refreshToken} = await genrateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password, -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                loggedInUser, accessToken, refreshToken
            },
            "user login successfully"

        )
    )


})


const logoutUser = asyncHandler(async ( req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})


const refreshtoken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = await req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorize request");        
    }

    try {
        
        const decodedToken =  jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN)
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "invalid refresh token");            
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token expire");
            
        }

        const { accessToken, newRefreshToken} = await genrateAccessAndRefreshToken(user._id)

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshtoken:newRefreshToken},
                "refresh is created successfully"
            )
        )

    } catch (error) {
        throw new ApiError(401, error?.message, "invalid refresh token");
        
    }
})


const changeCurrentPassword = asyncHandler( async(req, res)=> {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorecct = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorecct) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "password changed successfully")
    )

})


const getCurrentUser = asyncHandler( async(req, res) => {
    return res
    .status(200)
    .json(
        200, req.user, "current user fetched successfully"
    )
})


const updateAccountDetails = asyncHandler( async(req, res) => {
    const {fullname, email} = req.body
    if(!fullname || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                email,
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "user update successfully")
    )
    
})

const updateAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res 
    .status(200)
    .json(200, user, "avatar image is update successfully")


})

const updateCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(avatarLocalPath)
    if (!coverImage) {
        throw new ApiError(400, "Error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res 
    .status(200)
    .json(200, user, "cover image is update successfully")


})

const userChannelProfile = asyncHandler( async (req,res) => {
    const { userName } = req.params
    if (!userName) {
        throw new ApiError(400, "user is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                userName: userName?.toLowerCase
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscribe",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribesCount:{
                    $size: "subscribers"
                },
                channelSubscribedToCount:{
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond:{
                          if: {$in: [req.user?._id, "subscribers.subscriber"]},
                          then: true,
                          else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                userName: 1,
                avatar: 1,
                coverImage: 1,
                isSubscribed: 1,
                subscribesCount: 1,
                channelSubscribedToCount: 1
            }
        }
    ])
    if (!channel?.length) {
        throw new ApiError(400, "channel does not exits")
    }
    return res.status(200)
    .json(
        new ApiResponse(200, channel[0], "user channel fetched successfully")
    )
})

const getUsrWatchHistory = asyncHandler( async (req, res) => {
    const user = User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})





export {
    registerUser,
      loginUser,
      logoutUser,
      refreshtoken,
      changeCurrentPassword,
      getCurrentUser,
      updateAccountDetails,
      updateAvatar,
      updateCoverImage,
      userChannelProfile,
      
}

