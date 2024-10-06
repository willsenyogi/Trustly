const express = require("express");
const router = express.Router();
const User = require("../model/user");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const {
  generateAccountNumber,
  generateCardNumber,
} = require("../controller/accountController");
const sendMail = require("../controller/otpmailer");

router.get("/signup", async (req, res) => {
    res.render("signup", {
      title: "Trustly - Signup",
      showHeader: false,
      showFooter: false,
      showDashboardNav: false,
      errors: [],
      formData: {},
    });
  });
  
  router.post("/signup/submit", async (req, res) => {
    const users = await User.find({});
    const { name, email, password, accesscode, cardType } = req.body;
    let errors = [];
  
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long.");
    }
  
    if (!/^\d{6}$/.test(accesscode)) {
      errors.push("Access code must be exactly 6 digits.");
    }
  
    if (!name || !email || !password || !accesscode || !cardType) {
      errors.push("All fields are required.");
    }
  
    if (users.some((user) => user.email === email)) {
      errors.push("Email already exists.");
    }

    if (!/^[A-Za-z\s]+$/.test(name)) {
      errors.push("Name cannot contain numbers or symbols.");
    }
    
    if  (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Email must contain '@' and end valid email domain.");
    }
  
    if (errors.length > 0) {
      return res.render("signup", {
        title: "Trustly - Signup",
        showHeader: false,
        showFooter: false,
        showDashboardNav: false,
        errors,
        formData: { name, email, cardType },
      });
    }
  
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
    req.session.otp = otp;
    req.session.userData = { name, email, password, accesscode, cardType };
  
    try {
      await sendMail(email, "Your OTP for Trustly Signup", `Your OTP code is ${otp}`);
      res.redirect("/signup/emailverification");
    } catch (error) {
      console.log(error);
      res.status(500).send("An error occurred while sending the OTP email.");
    }
  });
  
  router.get("/signup/emailverification", (req, res) => {
    res.render("emailverification", {
      title: "Trustly - Email Verification",
      showHeader: false,
      showFooter: false,
      showDashboardNav: false,
      errors: [],
    });
  });
  
  router.post("/signup/emailverification", async (req, res) => {
    const { otp } = req.body;
    const { name, email, password, accesscode, cardType } = req.session.userData;
  
    if (otp !== req.session.otp) {
      return res.render("emailverification", {
        title: "Trustly - Email Verification",
        showHeader: false,
        showFooter: false,
        showDashboardNav: false,
        errors: ["Invalid OTP. Please try again."],
      });
    }
  
    const cardExpiry = new Date();
    cardExpiry.setFullYear(cardExpiry.getFullYear() + 5);
    cardExpiry.setMonth(cardExpiry.getMonth() + 1);
    cardExpiry.setDate(0);
    cardExpiry.setHours(23, 59, 59, 999);
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const hashedCode = await bcrypt.hash(accesscode, 10);
      const accountNumber = generateAccountNumber();
      const cardNumber = generateCardNumber();
  
      const user = new User({
        name,
        email,
        password: hashedPassword,
        accesscode: hashedCode,
        cardType,
        cardExpiry,
        accountNumber,
        cardNumber,
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
  
  router.get("/login", async (req, res) => {
    res.render("login", {
      title: "Trustly - Login",
      showHeader: false,
      showFooter: false,
      showDashboardNav: false,
      error: req.flash("error"),
    });
  });
  
  router.post(
    "/login/submit",
    passport.authenticate("local", {
      successRedirect: "/dashboard",
      failureRedirect: "/login",
      failureFlash: true,
    })
  );

module.exports = router