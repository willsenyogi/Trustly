const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const passport = require("passport");
const expressLayout = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash'); // Import connect-flash
const accountController = require('./controller/accountController');
require('./auth/local.js');

// Static files and parsers
app.use(express.static('public'));
app.use(express.json());
app.use(cors());
dotenv.config();
app.use(express.urlencoded({ extended: true }));

// Configure session middleware (make sure this comes before flash and passport)
app.use(session({
    secret: 'your_secret_key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true if using HTTPS
}));

// Initialize flash messages after session middleware
app.use(flash());

// Initialize Passport and sessions after session and flash middleware
app.use(passport.initialize());
app.use(passport.session());

// Global variables for flash messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.error = req.flash('error'); // For Passport's error messages
    next();
});

// Database connection
try {
    mongoose.connect(`${process.env.MONGO_URI}`);
    console.log(`Database connected : ${process.env.MONGO_URI}`);
} catch (error) {
    console.log("Error connecting to database", error);
}

// Layouts and view engine
app.use(expressLayout);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');

// Routes
app.use('/', require('./routes/router.js'));
app.use('/', require('./routes/auth.js'));
app.use('/', require('./routes/account.js'));

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
