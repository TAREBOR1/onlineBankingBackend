const Wallet = require("../models/wallet");


exports.getAllWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, wallets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// ADMIN FUNCTIONALITY
// =========================

exports.createWallet = async (req, res) => {
  try {
    const { currency, symbol, network, address, logoUrl } = req.body;

    if (!currency || !symbol || !network || !address) {
      return res.status(400).json({ success: false, message: "Please fill all required fields" });
    }

    const wallet = await Wallet.create({
      currency,
      symbol,
      network,
      address,
      logoUrl,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, message: "Asset activated successfully", wallet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findByIdAndDelete(req.params.id);
    if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

    res.status(200).json({ success: true, message: "Asset removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};