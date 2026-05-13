const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Account = require("../models/account");

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE PROFILE (Phone & Avatar)

exports.updateProfile = async (req, res) => {
  try {
    const { phone } = req.body;
    const updateData = {};

    if (phone) updateData.phone = phone;

    // If a file was uploaded, Multer puts the Cloudinary URL in req.file.path
    if (req.file) {
      updateData.avatar = req.file.path; 
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Current password incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




// =========================
// ADMIN FUNCTIONALITY
// =========================

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    // Build the query object for search
    const query = {};
    if (search) {
      query.$or = [
        { firstname: { $regex: search, $options: "i" } },
        { lastname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } }
      ];
    }

    // Get total count for pagination math
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    // Fetch users for the current page
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Fetch accounts only for the users on this page to optimize performance
    const userIds = users.map(user => user._id);
    const accounts = await Account.find({ userId: { $in: userIds } }).lean();

    // Map balances to the users
    const formattedUsers = users.map(user => {
      const userAccount = accounts.find(acc => acc.userId.toString() === user._id.toString());
      return {
        ...user,
        balance: userAccount ? userAccount.balance : 0,
      };
    });

    res.status(200).json({ 
      success: true, 
      users: formattedUsers,
      pagination: {
        totalItems: totalUsers,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};