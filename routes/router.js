const express = require("express");
const router = express.Router();
const User = require("../model/user");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const { generateAccountNumber, generateCardNumber } = require("../controller/accountController");

router.get("/", async (req, res) => {
    res.render("homepage", { title: "Trustly - When Trust Meets Finance", showDashboardNav: false });
});

router.get("/login", async (req, res) => {
    res.render("login", { title: "Trustly - Login", showHeader: false, showFooter: false, showDashboardNav: false, error: req.flash('error') });
});

router.post("/login/submit", passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));


router.get("/signup", async (req, res) => {
    res.render("signup", { title: "Trustly - Signup", showHeader: false, showFooter: false, showDashboardNav: false });
});

router.post("/signup/submit", async (req, res) => {
    const { name, email, password, cardType } = req.body;
    const cardExpiry = new Date();
    cardExpiry.setFullYear(cardExpiry.getFullYear() + 5);
    cardExpiry.setMonth(cardExpiry.getMonth() + 1);
    cardExpiry.setDate(0);
    cardExpiry.setHours(23, 59, 59, 999);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const accountNumber = generateAccountNumber();
        const cardNumber = generateCardNumber();

        const user = new User({
            name,
            email,
            password: hashedPassword,
            cardType,
            cardExpiry,
            accountNumber,
            cardNumber
        });
        await user.save();

        req.login(user, (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("An error occurred while logging in.");
            }
            res.redirect("/dashboard");
            console.log(`User ${name} added and logged in`);
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.get("/dashboard", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const loggedUser = await User.findById(req.session.passport.user);

            if (!loggedUser) {
                return res.redirect('/login');
            }

            const cardExpiry = loggedUser.cardExpiry;
            const formattedExpiry = cardExpiry ? 
                `${String(cardExpiry.getMonth() + 1).padStart(2, '0')}/${String(cardExpiry.getFullYear()).slice(-2)}` 
                : 'N/A';

            res.render("dashboard", {
                title: "Trustly - Dashboard",
                showHeader: false,
                showFooter: false,
                showDashboardNav: true,
                loggedUser,
                formattedExpiry
            });
        } catch (error) {
            console.error("Error fetching user:", error);
            res.status(500).send("An error occurred while loading the dashboard.");
        }
    } else {
        res.redirect('/login');
    }
});


router.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.redirect('/dashboard');
            }
            res.redirect('/login');
        });
    });
});

module.exports = router;
