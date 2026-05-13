const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", index: true },

    cardHolderName: String,

    brand: {
      type: String,
      enum: ["visa", "mastercard", "amex"],
    },
   fullCardNumber:String,
    last4: String,
    bin: String,


    expiryMonth: Number,
    expiryYear: Number,
    cvv:String,

    status: {
      type: String,
      enum: ["active", "blocked", "expired", "pending"],
      default: "active",
    },

    isVirtual: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Card = mongoose.model("Card", CardSchema);
module.exports= Card