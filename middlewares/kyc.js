const User = require("../models/User");

exports.requireKYC = (req, res, next) => {
  try {
  const userId = req.user.id;

  const user= User.findById(userId)

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // allow admin bypass
    if (user.role === "admin") {
      return next();
    }

    if (user.kycStatus !== "verified") {
      return res.status(403).json({
        message: "KYC verification required",
        kycStatus: user.kycStatus,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "KYC check failed",
    });
  }
};
;