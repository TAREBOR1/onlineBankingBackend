const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: "Card" },

    type: {
      type: String,
      enum: ["deposit", "withdrawal", "transfer", "card_payment"],
    },

    amount: { type: Number, required: true },
    currency: String,

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    reference: { type: String, unique: true, index: true },

    metadata: {
      type: Object, // optional: store transactionId, amount, etc.
      default: {},
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", TransactionSchema);

module.exports= Transaction