const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET ;
const JWT_EXPIRES_IN = '1d'

// Create JWT token
exports.createToken = (user) => {
  return jwt.sign(
      { id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};



// Verify JWT token
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};


 