const mongoose = require("mongoose");

const LedgerEntrySchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", index: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },

    type: {
      type: String,
      enum: ["debit", "credit"],
    },

    amount: Number,
    balanceAfter: Number,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const LedgerEntry = mongoose.model("LedgerEntry", LedgerEntrySchema);
module.exports=LedgerEntry