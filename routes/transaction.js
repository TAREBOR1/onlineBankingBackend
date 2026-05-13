const express = require("express");
const { deposit, transfer, withdraw, getTransactionHistory, getActiveWallets, submitDepositRequest, getPendingDeposits, processDeposit } = require("../controllers/transaction");
const { userProtect, authorize } = require("../middlewares/auth");
const { upload } = require("../config/cloudinary");
const  transactionRoute= express.Router();

transactionRoute.post('/deposit',userProtect,deposit)
transactionRoute.post('/transfer',userProtect,transfer)
transactionRoute.post('/withdraw',withdraw)
transactionRoute.get("/history/:accountId",getTransactionHistory)
transactionRoute.get('/wallets',userProtect,getActiveWallets)
transactionRoute.post('/deposit-request',userProtect,upload.single('receipt'),submitDepositRequest)


// =========================
// ADMIN FUNCTIONALITY
// =========================

transactionRoute.get('/pending-deposit',userProtect,authorize('admin'),getPendingDeposits)
transactionRoute.patch('/process-deposit/:id',userProtect,authorize('admin'),processDeposit)

module.exports = transactionRoute;