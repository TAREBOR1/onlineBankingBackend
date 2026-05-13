const express= require('express')
const { userProtect, authorize } = require('../middlewares/auth')
const { upload } = require('../config/cloudinary')
const { getProfile, updateProfile, changePassword, getAllUsers } = require('../controllers/user')




const userRoute=express.Router()



userRoute.get('/',userProtect, getProfile)
userRoute.patch('/update',userProtect,upload.single('avatar'),updateProfile)
userRoute.patch('/password',userProtect,changePassword)

// =========================
// ADMIN FUNCTIONALITY
// =========================

userRoute.get('/allUsers',userProtect,authorize('admin'),getAllUsers)


module.exports=userRoute