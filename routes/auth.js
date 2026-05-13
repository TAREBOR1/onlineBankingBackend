const express= require('express')
const { signup, login, verifyUser } = require('../controllers/auth')
const { userProtect } = require('../middlewares/auth')



const authRoute=express.Router()


authRoute.post('/signup',signup)
authRoute.post('/login',login)
authRoute.get('/verify',userProtect,verifyUser)



module.exports=authRoute