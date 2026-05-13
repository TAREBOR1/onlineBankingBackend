const express= require('express')
const { userProtect, authorize } = require('../middlewares/auth')
const { getAccount, getMyAccount, getAccountInfo, getAllAccounts, toggleAccountStatus } = require('../controllers/account')



const accountRoute=express.Router()



accountRoute.get('/getAccountInfo/:accountNum',userProtect,getAccountInfo)
accountRoute.get('/getMyAccount',userProtect,getMyAccount)

// =========================
// ADMIN FUNCTIONALITY
// =========================

accountRoute.get('/',userProtect,authorize('admin'),getAllAccounts)
accountRoute.patch('/:id/toggle-status',userProtect,authorize('admin'),toggleAccountStatus)



module.exports=accountRoute