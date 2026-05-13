const Account = require("../models/account");
const Card = require("../models/card");
const Transaction = require("../models/transaction");

exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const accounts = await Account.find({ userId }).populate("userId","firstname lastLogin").lean();

    const accountIds = accounts.map(acc => acc._id);

    const transactions = await Transaction.find({
      $or: [
        { fromAccountId: { $in: accountIds } },
        { toAccountId: { $in: accountIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("fromAccountId toAccountId", "accountNumber")
      .lean();

    const cards = await Card.find({ userId }).lean();

    return res.status(200).json({
      success: true,
      data: {
        accounts,
        cards,
        transactions,
      },
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};