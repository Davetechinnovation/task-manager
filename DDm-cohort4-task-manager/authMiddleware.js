const jwt = require('jsonwebtoken');
const dotenv = require('dotenv'); // Import dotenv

dotenv.config(); // Load environment variables from .env file

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token using JWT_SECRET from environment variables
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT Verification Error in middleware:', err); // Log errors in middleware
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user; // Attach the user information to the request object
        next(); // Proceed to the next middleware or route handler
    });
};

module.exports = authenticateToken;