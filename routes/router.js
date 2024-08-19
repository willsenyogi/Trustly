const express = require("express");
const router = express.Router();
const User = require("../model/user");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const TransactionHistory = require("../model/transactionHistory");
const {
  generateAccountNumber,
  generateCardNumber,
} = require("../controller/accountController");
const transactionHistory = require("../model/transactionHistory");

router.get("/", async (req, res) => {
  res.render("homepage", {
    title: "Trustly - When Trust Meets Finance",
    showDashboardNav: false,
  });
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

router.get("/dashboard", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(req.session.passport.user);

      if (!loggedUser) {
        return res.redirect("/login");
      }

      const cardExpiry = loggedUser.cardExpiry;
      const formattedExpiry = cardExpiry
        ? `${String(cardExpiry.getMonth() + 1).padStart(2, "0")}/${String(
            cardExpiry.getFullYear()
          ).slice(-2)}`
        : "N/A";

      res.render("dashboard", {
        title: "Trustly - Dashboard",
        showHeader: false,
        showFooter: false,
        showDashboardNav: true,
        loggedUser,
        formattedExpiry,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).send("An error occurred while loading the dashboard.");
    }
  } else {
    res.redirect("/login");
  }
});

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/dashboard");
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.redirect("/dashboard");
      }
      res.redirect("/login");
    });
  });
});

router.get("/profile", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(req.session.passport.user);
      res.render("profile", {
        title: "Trustly - Profile",
        showHeader: false,
        showFooter: false,
        showDashboardNav: true,
        loggedUser,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).send("An error occurred while loading the profile.");
    }
  } else {
    res.redirect("/login");
  }
});
router.get("/transfer", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(req.session.passport.user);
      res.render("transfer", {
        title: "Trustly - Transfer",
        showHeader: false,
        showFooter: false,
        showDashboardNav: true,
        loggedUser,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).send("An error occurred while loading the transfer.");
    }
  } else {
    res.redirect("/login");
  }
  
})

router.post("/transfer", async (req, res) => {
    if (req.isAuthenticated()) {
      try {
        const loggedUser = await User.findById(req.session.passport.user);
        const { accountNumber, transferAmount } = req.body;
        
        // Check if transferAmount is valid
        if (isNaN(transferAmount) || transferAmount <= 0) {
          return res.status(400).json({ error: "Invalid transfer amount" });
        }
  
        // Check for sufficient balance
        if (loggedUser.balance - transferAmount < 0) {
          return res.status(400).json({ error: "Insufficient balance" });
        }
  
        // Find target user by account number
        const targetAccountObj = await User.findOne({ accountNumber });
        if (!targetAccountObj) {
          return res.status(400).json({ error: "Invalid target account number" });
        }
  
        // Log the balances before update
        console.log(`Before Transfer - Sender Balance: ${loggedUser.balance}, Receiver Balance: ${targetAccountObj.balance}`);
        
        // Update balances
        loggedUser.balance -= Number(transferAmount);
        targetAccountObj.balance += Number(transferAmount);
  
        // Save changes
        await loggedUser.save();
        await targetAccountObj.save();
  
        // Log the balances after update
        console.log(`After Transfer - Sender Balance: ${loggedUser.balance}, Receiver Balance: ${targetAccountObj.balance}`);
  
        // Save transaction history
        const history = new transactionHistory({
          sender: loggedUser.accountNumber,
          receiver: targetAccountObj.accountNumber,
          amount: transferAmount,
          transactionType: "Transfer",
        });
        await history.save();
  
        res.redirect("/dashboard");
  
        console.log(`User ${loggedUser.name} transferred ${transferAmount} to account ${targetAccountObj.accountNumber}`);
      } catch (error) {
        console.error("Error processing transfer:", error);
        res.status(500).send("An error occurred while processing your request.");
      }
    } else {
      res.redirect("/login");
    }
  });
  
  
module.exports = router;
