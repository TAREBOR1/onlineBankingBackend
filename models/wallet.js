const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  currency: { type: String, required: true }, // e.g., "Bitcoin"
  symbol: { type: String, required: true },   // e.g., "BTC"
  network: { type: String, required: true },  // e.g., "ERC20", "TRC20"
  address: { type: String, required: true, unique: true },
  logoUrl: { type: String },                  // The URL we added in the UI refactor
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
}, { timestamps: true });

const Wallet = mongoose.model("Wallet", WalletSchema);
module.exports= Wallet