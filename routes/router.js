const express = require("express");
const router = express.Router();
const User = require("../model/user");
const flash = require("express-flash");

// router.use(flash());

router.get("/", async (req, res) => {
    res.render("homepage", { title: "Trustly - When Trust Meets Finance" });
});

router.get("/login", async (req, res) => {
    res.render("login", { title: "Trustly - Login", showHeader: false });
});

router.get("/signup", async (req, res) => {
    res.render("signup", { title: "Trustly - Signup", showHeader: false });
});

router.post("/login/submit", async (req, res) => {
    const userInput = req.body.email;
    const userPassword = req.body.password;

    try {
        const user = await User.findOne({ email: userInput, password: userPassword });
        if (user) {
            res.redirect("/");
            // req.flash("error", "Invalid Credentials");
        } else {
            res.redirect("/login");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred while processing your request.");
    }

});

router.post("/signup/submit", async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    try{
        const user = new User({username, email, password});
        await user.save();
        res.redirect("/");
        console.log(`user ${username} added`);
    } catch (error){
        console.log(error);
    }
});

module.exports = router