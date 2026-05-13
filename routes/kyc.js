const express= require('express')
const { userProtect, authorize } = require('../middlewares/auth')
const { getMyKYC, submitKYC, getAllKYC, rejectKYC, approveKYC } = require('../controllers/kyc')
const { upload } = require('../config/cloudinary')




const kycRoute=express.Router()



kycRoute.get('/getKyc',userProtect, getMyKYC)
kycRoute.post('/submit',userProtect,upload.fields([
    { name: 'front', maxCount: 1 }, 
    { name: 'back', maxCount: 1 }
  ]),submitKYC)

// =========================
// ADMIN FUNCTIONALITY
// =========================

kycRoute.get('/getAllKyc',userProtect,authorize('admin'),getAllKYC)
kycRoute.patch('/:id/reject',userProtect,authorize('admin'),rejectKYC)
kycRoute.patch('/:id/approve',userProtect,authorize('admin'),approveKYC)

module.exports=kycRoute