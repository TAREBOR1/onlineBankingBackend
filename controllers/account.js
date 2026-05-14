const mongoose = require("mongoose");

const User = require("../models/user");
const Account = require("../models/account");



// =========================
// GET USER ACCOUNT(S)
// =========================
exports.getMyAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const accounts = await Account.find({ userId }).populate('userId');

    res.json({
      success: true,
      accounts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// GET SINGLE ACCOUNT (SAFE)
// =========================
exports.getAccountInfo = async (req, res) => {
  try {
    const { accountNum } = req.params;

    const account = await Account.find({accountNumber:accountNum}).populate('userId','firstname lastname').lean();

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({
      success: true,
      account,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// =========================
// GET BALANCE ONLY
// =========================
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId } = req.params;

    const account = await Account.findById(accountId);

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (account.userId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({
      success: true,
      balance: account.balance,
      availableBalance: account.availableBalance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// ADMIN FUNCTIONALITY
// =========================


exports.getAllAccounts = async(req,res)=>{
  try {
        const accounts = await Account.find().populate('userId','firstname lastname kycStatus email').lean();

    if (!accounts) {
      return res.status(404).json({ message: "Account not found" });
    }

    const totalLiquidity = accounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);

    res.status(200).json({ success: true, totalLiquidity, accounts });
    
  } catch (error) {
      res.status(500).json({ message: err.message });
  }
}


exports.toggleAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);
    
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    // Toggle logic
    account.status = account.status === "active" ? "frozen" : "active";
    await account.save();

    res.status(200).json({ 
      success: true, 
      message: `Account has been successfully ${account.status}`,
      account
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

