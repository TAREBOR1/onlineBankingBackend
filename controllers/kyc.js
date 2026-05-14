const KYC = require("../models/kyc");
const User = require("../models/user");
const { createNotification } = require("./notification");





exports.submitKYC = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Destructure text data from req.body
    const {
      firstName, lastName, email, phone, dob, ssn,
      addressLine1, city, state, country, zipCode,
      documentType, documentNumber
    } = req.body;

    // 2. Initial Checks: Does user exist?
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 3. Extract Cloudinary URLs from req.files FIRST
    // This must happen before we try to use it in the update or create logic
    const idCard = {
      front: req.files && req.files['front'] ? req.files['front'][0].path : "",
      back: req.files && req.files['back'] ? req.files['back'][0].path : ""
    };

    // 4. Validate Files (Only required for initial submission or if you want to force new uploads)
    if (!idCard.front) {
      return res.status(400).json({ message: "ID Card front image is required" });
    }

    // 5. Check for existing KYC record
    const existingKYC = await KYC.findOne({ userId });

    if (existingKYC) {
      // Logic: If already verified or currently pending, block re-submission
      if (user.kycStatus === "verified" || user.kycStatus === "pending") {
        return res.status(400).json({ 
          message: "Verification already in progress or completed." 
        });
      }

      // IF STATUS IS REJECTED (or unverified): Overwrite existing record
      existingKYC.documentType = documentType;
      existingKYC.documentNumber = documentNumber;
      existingKYC.idCard = idCard; // Now idCard is correctly defined
      existingKYC.address = { addressLine1, city, state, country, zipCode };
      existingKYC.contact = { firstName, lastName, email, phone, dob, ssn };
      existingKYC.rejectionReason = ""; // Wipe the old rejection reason

      await existingKYC.save();
      
      user.kycStatus = "pending";
      await user.save();

      // Trigger Notification
      createNotification({
        userId: user._id,
        title: "KYC Re-submitted 🔍",
        message: "Your updated documents have been received and are under review.",
        type: "system"
      });

      return res.status(200).json({ 
        success: true,
        message: "KYC re-submitted successfully",
        kyc: existingKYC 
      });
    }

    // 6. CREATE NEW KYC (If no record exists)
    const kyc = await KYC.create({
      userId,
      documentType,
      documentNumber,
      idCard,
      address: {
        addressLine1,
        city,
        state,
        country,
        zipCode
      },
      contact: {
        firstName,
        lastName,
        email,
        phone,
        dob,
        ssn
      }
    });

    // Update User Status to pending
    user.kycStatus = "pending";
    await user.save();

    // Trigger Notification (Fire and Forget)
    createNotification({
      userId: user._id,
      title: "KYC Under Review 🔍",
      message: "We've received your documents. Our team will verify them within 24-48 hours.",
      type: "system"
    });

    return res.status(201).json({
      success: true,
      message: "KYC documents uploaded and submitted successfully",
      kyc
    });

  } catch (error) {
    console.error("KYC Submission Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};




exports.getMyKYC = async (req, res) => {
  try {
    const userId = req.user.id;

    const kyc = await KYC.findOne({ userId });

    if (!kyc) {
      return res.status(404).json({
        message: "KYC not found",
      });
    }

    res.status(200).json(kyc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =========================
// ADMIN FUNCTIONALITY
// =========================


exports.getAllKYC = async (req, res) => {
  try {
    const kycs = await KYC.find().populate("userId");

    res.status(200).json(kycs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveKYC = async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await KYC.findById(id);

    if (!kyc) {
      return res.status(404).json({ message: "KYC not found" });
    }

    const user = await User.findById(kyc.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    kyc.verifiedAt = new Date();

    user.kycStatus = "verified";

    await kyc.save();
    await user.save();

    res.status(200).json({
      message: "KYC approved successfully",
      kyc,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.rejectKYC = async (req, res) => {
  try {
    const { id } = req.params; // KYC Record ID
    const { reason } = req.body;

    // 1. Find the KYC record
    const kyc = await KYC.findById(id);
    if (!kyc) {
      return res.status(404).json({ success: false, message: "KYC record not found" });
    }

    // 2. Find the associated User
    const user = await User.findById(kyc.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Associated user not found" });
    }

    // 3. Update the KYC record with the reason
    kyc.rejectionReason = reason || "Documents provided were invalid or unclear.";
    // Optional: You could clear the idCard URLs here if you want them to disappear immediately
    // kyc.idCard.front = ""; 
    // kyc.idCard.back = "";

    // 4. Update the User Status
    user.kycStatus = "rejected";

    await kyc.save();
    await user.save();

    // 5. Notify the User (Crucial so they check the app)
    createNotification({
      userId: user._id,
      title: "Verification Declined ❌",
      message: `Your identity verification was not approved. Reason: ${reason}. Please resubmit your documents.`,
      type: "security"
    });

    res.status(200).json({
      success: true,
      message: "KYC rejected and user notified",
      reason: reason
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

