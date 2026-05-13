const mongoose = require("mongoose");
const Account = require("../models/account");
const Transaction = require("../models/transaction");
const LedgerEntry = require("../models/ledgerentry");
const { createNotification } = require("./notification");
const Wallet = require("../models/wallet");
const crypto = require("crypto");


 exports.transfer = async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    // Get accounts and populate userId to get the owner's ID for notifications
    const sender = await Account.findById(fromAccountId).session(session).populate("userId");
    const receiver = await Account.findById(toAccountId).session(session).populate("userId");

    if (!sender || !receiver) {
      throw new Error("Account not found");
    }

    if (sender.balance < amount) {
      throw new Error("Insufficient balance");
    }

    const reference = "TXN-" + Date.now();

    // Create transaction
    const transaction = await Transaction.create(
      [
        {
          fromAccountId,
          toAccountId,
          type: "transfer",
          amount,
          currency: sender.currency,
          status: "completed",
          reference,
        },
      ],
      { session }
    );

    // Update balances
    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save({ session });
    await receiver.save({ session });

    // Create ledger entries
    await LedgerEntry.insertMany(
      [
        {
          accountId: sender._id,
          transactionId: transaction[0]._id,
          type: "debit",
          amount,
          balanceAfter: sender.balance,
          metadata: { merchantName: `Transfer to ${receiver.userId.firstname}` } // Added for UI consistency
        },
        {
          accountId: receiver._id,
          transactionId: transaction[0]._id,
          type: "credit",
          amount,
          balanceAfter: receiver.balance,
          metadata: { merchantName: `Received from ${sender.userId.firstname}` } // Added for UI consistency
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // ==========================================
    // TRIGGER NOTIFICATIONS (Post-Commit)
    // ==========================================
    
    // Notify Sender
    createNotification({
      userId: sender.userId._id,
      title: "Transfer Successful",
      message: `You have successfully sent ${sender.currency === 'USD' ? '$' : '₦'}${amount.toLocaleString()} to ${receiver.userId.firstname}.`,
      type: "transaction",
      metadata: { transactionId: transaction[0]._id }
    });

    // Notify Receiver
    createNotification({
      userId: receiver.userId._id,
      title: "Funds Received",
      message: `You just received ${receiver.currency === 'USD' ? '$' : '₦'}${amount.toLocaleString()} from ${sender.userId.firstname}.`,
      type: "transaction",
      metadata: { transactionId: transaction[0]._id }
    });

    res.status(200).json({
      success: true,
      message: "Transfer successful",
      transaction: transaction[0],
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    res.status(400).json({ message: err.message, success: false });
  }
};

exports.deposit = async (req, res) => {
  const { accountId, amount } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Populate userId to get the owner for the notification
    const account = await Account.findById(accountId).session(session).populate("userId");

    if (!account) throw new Error("Account not found");

    const transaction = await Transaction.create(
      [
        {
          toAccountId: accountId,
          type: "deposit",
          amount,
          currency: account.currency,
          status: "completed",
          reference: "DEP-" + Date.now(),
        },
      ],
      { session }
    );

    account.balance += amount;
    await account.save({ session });

    await LedgerEntry.create(
      [
        {
          accountId: account._id,
          transactionId: transaction[0]._id,
          type: "credit",
          amount,
          balanceAfter: account.balance,
          metadata: { merchantName: "Wallet Deposit", note: "Top-up via Gateway" }
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Trigger Notification
    createNotification({
      userId: account.userId._id,
      title: "Deposit Successful",
      message: `Your account has been credited with ${account.currency === 'USD' ? '$' : '₦'}${amount.toLocaleString()}.`,
      type: "transaction",
      metadata: { transactionId: transaction[0]._id }
    });

    res.json({ success: true, message: "Deposit successful" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message, success: false });
  }
};

exports.manualDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: "Invalid amount" });

    const account = await Account.findById(id);
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    account.balance += Number(amount);
    account.availableBalance += Number(amount);
    await account.save();

    await Transaction.create({
      userId: account.userId,
      accountId: account._id,
      type: "deposit",
      amount: Number(amount),
      status: "completed",
      description: "Manual Admin Credit",
      metadata: { processedBy: req.user.id }
    });

    res.status(200).json({ success: true, message: `Successfully credited $${amount}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.withdraw = async (req, res) => {
  const { accountId, amount } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Populate userId to get the owner for the notification
    const account = await Account.findById(accountId).session(session).populate("userId");

    if (!account) throw new Error("Account not found");

    if (account.balance < amount) {
      throw new Error("Insufficient balance");
    }

    const transaction = await Transaction.create(
      [
        {
          fromAccountId: accountId,
          type: "withdrawal",
          amount,
          currency: account.currency,
          status: "completed",
          reference: "WDR-" + Date.now(),
        },
      ],
      { session }
    );

    account.balance -= amount;
    await account.save({ session });

    await LedgerEntry.create(
      [
        {
          accountId: account._id,
          transactionId: transaction[0]._id,
          type: "debit",
          amount,
          balanceAfter: account.balance,
          metadata: { merchantName: "Cash Withdrawal", note: "Atm/Bank Withdrawal" }
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Trigger Notification
    createNotification({
      userId: account.userId._id,
      title: "Withdrawal Successful",
      message: `You have successfully withdrawn ${account.currency === 'USD' ? '$' : '₦'}${amount.toLocaleString()}.`,
      type: "transaction",
      metadata: { transactionId: transaction[0]._id }
    });

    res.json({ success: true, message: "Withdrawal successful" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message, success: false });
  }
};


exports.getTransactionHistory = async (req, res) => {
  try {
    const { accountId } = req.params; 
  
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { type, startDate, endDate } = req.query;

    const query = { accountId };

    // Strict type filtering
    if (type && type !== 'all') {
      query.type = type; 
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const history = await LedgerEntry.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("transactionId");

    const total = await LedgerEntry.countDocuments(query);

    res.json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      data: history,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActiveWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find().select("-createdAt -updatedAt");
    
    res.status(200).json({ success: true, wallets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.submitDepositRequest = async (req, res) => {
  try {
    const { amount, walletId, currency } = req.body;
    const userId = req.user.id;

    // 1. Validate Input
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    // 2. Get User's Primary Account
    const account = await Account.findOne({ userId });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found. Complete KYC first." });
    }

    // 3. Extract Receipt Image from Multer/Cloudinary
    let receiptUrl = "";
    if (req.file && req.file.path) {
      receiptUrl = req.file.path;
    }

    if (!receiptUrl) {
      return res.status(400).json({ success: false, message: "Payment receipt proof is required" });
    }

    // 4. Generate Unique Reference
    const reference = "DEP-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    // 5. Create Pending Transaction
    const transaction = await Transaction.create({
      toAccountId: account._id,
      type: "deposit",
      amount: Number(amount),
      currency: account.currency || "USD",
      status: "pending",
      reference,
      metadata: {
        method: currency || "Crypto", // e.g., "BTC", "USDT"
        walletId,
        receiptUrl,
        note: "User initiated deposit"
      }
    });

    res.status(201).json({ 
      success: true, 
      message: "Deposit submitted successfully. Awaiting admin verification.",
      transaction
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// =========================
// ADMIN FUNCTIONALITY
// =========================


exports.getPendingDeposits = async (req, res) => {
  try {
    // 1. Fetch pending deposits and deeply populate the User through the Account
    const deposits = await Transaction.find({ type: "deposit", status: "pending" })
      .populate({
        path: "toAccountId",
        populate: {
          path: "userId", // Assuming the Account schema has a 'userId' ref
          select: "firstname lastname email avatar"
        }
      })
      .sort({ createdAt: -1 })
      .lean(); 
    // The UI expects `transaction.userId.firstname`, so we lift it up from `toAccountId`.
    const formattedDeposits = deposits.map((deposit) => {
      return {
        ...deposit,
        // Lift the user object up to the root level of the transaction
        userId: deposit.toAccountId && deposit.toAccountId.userId 
          ? deposit.toAccountId.userId 
          : null,
      };
    });

    res.status(200).json({ success: true, deposits: formattedDeposits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PROCESS DEPOSIT (APPROVE/REJECT)
exports.processDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adjustedAmount, note } = req.body; // action: 'approve' or 'reject'

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found" });
    if (transaction.status !== "pending") return res.status(400).json({ success: false, message: "Transaction already processed" });

    if (action === "approve") {
      const finalAmount = adjustedAmount ? Number(adjustedAmount) : transaction.amount;
      
      // FIX 1: Look up account using toAccountId stored in the transaction
      const account = await Account.findById(transaction.toAccountId);

      if (!account) return res.status(404).json({ success: false, message: "User account not found" });

      // Update User Account
      account.balance += finalAmount;
      account.availableBalance += finalAmount;
      await account.save();

      // Create Ledger Entry
      await LedgerEntry.create({
        accountId: account._id,
        transactionId: transaction._id,
        type: "credit",
        amount: finalAmount,
        balanceAfter: account.balance
      });

      // Update Transaction
      transaction.status = "completed";
      transaction.amount = finalAmount;
      transaction.metadata = { 
        ...transaction.metadata, 
        adminNote: note, 
        processedBy: req.user.id,
        processedAt: new Date()
      };
      await transaction.save();

      // FIX 2, 3 & 4: Corrected notification payload parameters
      createNotification({
        userId: account.userId, 
        title: "Deposit Successful",
        message: `Your account has been credited with ${account.currency === 'USD' ? '$' : '₦'}${finalAmount.toLocaleString()}.`,
        type: "transaction",
        metadata: { transactionId: transaction._id }
      });

      return res.status(200).json({ success: true, message: `Approved and credited $${finalAmount.toLocaleString()}` });
    } 
    
    if (action === "reject") {
      transaction.status = "failed"; // or 'rejected' depending on your schema enum
      transaction.metadata = { 
        ...transaction.metadata, 
        rejectionReason: note, 
        processedBy: req.user.id,
        processedAt: new Date()
      };
      await transaction.save();

      // Optional: Send a rejection notification as well
      const account = await Account.findById(transaction.toAccountId);
      if (account) {
        createNotification({
          userId: account.userId,
          title: "Deposit Declined",
          message: `Your deposit request for ${account.currency === 'USD' ? '$' : '₦'}${transaction.amount.toLocaleString()} was declined. Reason: ${note || 'Invalid receipt.'}`,
          type: "transaction",
          metadata: { transactionId: transaction._id }
        });
      }

      return res.status(200).json({ success: true, message: "Deposit request rejected" });
    }

    res.status(400).json({ success: false, message: "Invalid action" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};