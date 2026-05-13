const mongoose = require("mongoose");

const KYCSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Matches the "documentType" select and "documentNumber" input
    documentType: {
      type: String,
      enum: ["passport", "id_card", "driver_license"],
      required: true,
    },
    documentNumber: {
      type: String,
      required: true,
    },

    // Cloudinary URLs
    idCard: {
      front: {
        type: String,
        required: true,
      },
      back: {
        type: String,
        required: false, // Set to false if some documents only have one side
      },
    },

    // Matches Step 2: Address Details
    address: {
      addressLine1: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
    },

    // Matches Step 1: Personal Details
    contact: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      dob: {
        type: Date,
        required: true,
      },
      ssn: {
        type: String,
      },
    },

    // Admin/Status tracking
    rejectionReason: String,
    verifiedAt: Date,
  },
  { timestamps: true }
);

const KYC = mongoose.model("KYC", KYCSchema);
module.exports = KYC;