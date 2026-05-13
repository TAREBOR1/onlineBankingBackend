const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    accountNumber: { type: String, unique: true },

    currency: { type: String, default: "USD" },

    balance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "frozen", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Account = mongoose.model("Account", AccountSchema);
module.exports = Account