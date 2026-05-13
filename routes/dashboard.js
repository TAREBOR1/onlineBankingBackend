const express= require('express')
const { userProtect } = require('../middlewares/auth')
const { getUserDashboard } = require('../controllers/dashbaord')




const dashboardRoute=express.Router()



dashboardRoute.get('/getDashBoard',userProtect,getUserDashboard)



module.exports=dashboardRoute