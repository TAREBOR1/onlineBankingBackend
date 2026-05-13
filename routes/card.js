const express= require('express')
const { userProtect, authorize } = require('../middlewares/auth')
const { requestCard, getUserCards, toggleFreeze, revealCard, getPendingCardRequests, approveCard, declineCardRequest } = require('../controllers/card')





const cardRoute=express.Router()


cardRoute.post('/request',userProtect,requestCard)
cardRoute.get('/my-cards',userProtect,getUserCards)
cardRoute.patch('/:id/toggle-freeze',userProtect,toggleFreeze)
cardRoute.get('/:id/reveal',userProtect,revealCard)


// admin side

cardRoute.get('/pending',userProtect,authorize('admin'),getPendingCardRequests)
cardRoute.patch('/approve/:id',userProtect,authorize('admin'),approveCard)
cardRoute.delete('/decline/:id',userProtect,authorize('admin'),declineCardRequest)





module.exports=cardRoute