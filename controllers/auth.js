
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const validator = require("validator");

const { createToken } = require("../utils/jwt");
const User = require("../models/User");
const Account = require("../models/account");
const { createNotification } = require("./notification");




exports.signup = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      firstname,
      lastname,
      email,
      password
    } = req.body;

    if (!firstname || !lastname || !email || !password) {
      throw new Error("Missing details");
    }

    if (!validator.isEmail(email)) {
      throw new Error("Please Enter a valid Email");
    }

    if (password.length < 8) {
      throw new Error("Password must be 8 characters");
    }

    const existingUser = await User.findOne({ email }).session(session);

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userArr = await User.create(
      [
        {
          firstname,
          lastname,
          email,
          passwordHash: hashedPassword,
        },
      ],
      { session }
    );

    const user = userArr[0];

    const accountNumber = "ACC" + Date.now();

    const accountArr = await Account.create(
      [
        {
          userId: user._id,
          accountNumber,
          currency: "USD",
          balance: 0,
          availableBalance: 0,
          status: "active",
        },
      ],
      { session }
    );

    const account = accountArr[0];

    await session.commitTransaction();
    session.endSession();

    // ==========================
    // TRIGGER NOTIFICATION
    // ==========================
    createNotification({
      userId: user._id,
      title: "Welcome to Nexus Bank",
      message: `Hi ${firstname}, your account ${accountNumber} has been created successfully. We're excited to have you!`,
      type: "system",
    });

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
      account,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    return res.status(400).json({
      message: err.message,
      success: false,
    });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required', success: false });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User does not exist', success: false });

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(400).json({ message: 'Invalid password', success: false });
    }

    user.lastLogin = new Date();
    await user.save();

    // ==========================
    // TRIGGER NOTIFICATION
    // ==========================
    createNotification({
      userId: user._id,
      title: "New Login Detected",
      message: `Your account was just accessed at ${user.lastLogin.toLocaleString()}. If this wasn't you, please change your password immediately.`,
      type: "security",
    });

    const token = createToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message, success: false });
  }
};

exports.logout = (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
};

exports.verifyUser = async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) return res.status(401).json({ message: 'Unauthorized', success: false });

  return res.json(user);
};