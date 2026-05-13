const Account = require("../models/account");
const Card = require("../models/card");

exports.requestCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId, brand, cardHolderName } = req.body;

    const account = await Account.findById(accountId);
    if (!account || account.userId.toString() !== userId) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Check if there is already a card (active or pending)
    const existingCard = await Card.findOne({ accountId, status: { $ne: "expired" } });
    if (existingCard) {
      return res.status(400).json({ message: "You already have an active or pending card request." });
    }

    // Create card with 'pending' status
    const card = await Card.create({
      userId,
      accountId,
      cardHolderName,
      brand,
      status: "pending", // User cannot see details yet
      isVirtual: true,
    });

    res.status(201).json({ message: "Card request submitted for approval", card });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Get all cards for the logged-in user
exports.getUserCards = async (req, res) => {
  try {
    const userId = req.user.id;

    // We include pending cards so the UI can show "Awaiting Approval" states
    // but we exclude sensitive fields from the query for security
    const cards = await Card.find({ userId }).select("-cvv -fullCardNumber");

    res.status(200).json({
      success: true,
      cards
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific card's details
exports.getCard = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    if (card.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Logic Fix: If the card is still pending, don't return masked numbers 
    // because they haven't been generated yet.
    if (card.status === "pending") {
      return res.status(200).json({
        ...card.toObject(),
        message: "Card details will be available once approved by admin."
      });
    }

    // Return masked data for active/blocked cards
    const maskedCard = {
      ...card.toObject(),
      fullCardNumber: `**** **** **** ${card.last4}`,
      cvv: "***",
    };

    res.status(200).json(maskedCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User-initiated Freeze/Unfreeze (Toggling between 'active' and 'blocked')
exports.toggleFreeze = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);

    if (!card) return res.status(404).json({ message: "Card not found" });
    if (card.userId.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
    
    // Prevent freezing a card that isn't active yet
    if (card.status === "pending") {
      return res.status(400).json({ message: "Cannot freeze a card that is awaiting approval." });
    }

    // Toggle logic
    card.status = card.status === "active" ? "blocked" : "active";
    await card.save();

    res.status(200).json({
      message: `Card ${card.status === "blocked" ? "frozen" : "activated"} successfully`,
      status: card.status
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.revealCard = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);

    if (!card || card.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // You could add a check here: 
    // if (req.body.password !== user.password) throw Error...

    res.status(200).json({
      success: true,
      fullCardNumber: card.fullCardNumber,
      cvv: card.cvv,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};






// admin can do this


exports.blockCard = async (req, res) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    if (card.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    card.status = "blocked";
    await card.save();

    res.status(200).json({
      message: "Card blocked",
      card,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unblockCard = async (req, res) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    if (card.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    card.status = "active";
    await card.save();

    res.status(200).json({
      message: "Card unblocked",
      card,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.approveCard = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);

    if (!card) return res.status(404).json({ message: "Card not found" });

    // Generate Card Details only upon approval
    const fullCardNumber = (Math.floor(1000000000000000 + Math.random() * 9000000000000000)).toString();
    const cvv = Math.floor(100 + Math.random() * 900).toString();

    card.fullCardNumber = fullCardNumber;
    card.last4 = fullCardNumber.slice(-4);
    card.bin = fullCardNumber.slice(0, 6);
    card.cvv = cvv;
    card.expiryMonth = 12;
    card.expiryYear = new Date().getFullYear() + 5;
    card.status = "active";

    await card.save();
    res.status(200).json({ message: "Card approved and activated", card });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getPendingCardRequests = async (req, res) => {
  try {
    const pendingCards = await Card.find({ status: "pending" })
      .populate("userId", "firstname lastname email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      cards: pendingCards
    });
  } catch (error) {
    res.status(500).json({
      success: false, 
      message: error.message 
    });
  }
};

/**
 * 2) DECLINE CARD REQUEST
 * Removes the request from the database so the user can try again.
 */
exports.declineCardRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);

    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: "Card request not found" 
      });
    }

    // Optional: Only allow declining if the card is still in 'pending' status
    if (card.status !== "pending") {
      return res.status(400).json({ 
        success: false, 
        message: "Only pending requests can be declined" 
      });
    }

    // Delete the record
    await Card.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Card request declined and removed successfully"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};