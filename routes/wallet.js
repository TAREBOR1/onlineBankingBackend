const express = require("express");

const { userProtect } = require("../middlewares/auth");
const { getAllWallets, createWallet, deleteWallet } = require("../controllers/wallet");


const walletRoute = express.Router();

walletRoute.get('/',userProtect,getAllWallets)
walletRoute.post('/add-wallet',userProtect,createWallet)
walletRoute.delete('/remove-wallet/:id',userProtect,deleteWallet)




module.exports = walletRoute ;