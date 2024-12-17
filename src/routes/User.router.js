import {Router} from "express";
import { registerUser, 
        loginUser, 
        logoutUser , 
        refreshtoken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateAvatar,
        updateCoverImage,
        userChannelProfile,
        getUsrWatchHistory,} from "../Controllers/User.controller.js";

import { upload } from "../middlewares/Multer.middleware.js"
import { verifyJwt } from "../middlewares/Auth.middleware.js";
import multer from "multer";

const router = Router()

router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }

]), registerUser)

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/refreshToken").post(refreshtoken)
router.route("/changePassword".post(verifyJwt, changeCurrentPassword))
router.route("/updateAccountDetails".post(verifyJwt, updateAccountDetails))
router.route("/getCurrentUser".post(verifyJwt, getCurrentUser))
router.route("/updateAvatar".post(verifyJwt, upload.single("avatar"), updateAvatar))
router.route("/updateCoverImage".post(verifyJwt, upload.single("coverImage"), updateCoverImage))
router.route("/userChannelProfile".post(verifyJwt, userChannelProfile))
router.route("/getUsrWatchHistory".post(verifyJwt, getUsrWatchHistory))

export default router