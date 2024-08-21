const express = require("express");
const router = express.Router();
const User = require("../model/user");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const PDFDocument = require('pdfkit');
const path = require('path');
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
      const transactions = await transactionHistory.find({ sender: loggedUser.accountNumber }).sort({ date: -1 });

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
        transactions,
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
      const loggedUser = await User.findById(req.session.passport.user).populate('savedAccounts.ownerId');
      const savedAccounts = loggedUser.savedAccounts;
      res.render("transfer", {
        title: "Trustly - Transfer",
        showHeader: false,
        showFooter: false,
        showDashboardNav: true,
        loggedUser,
        savedAccounts,
        transfererror: req.flash('transfererror'),
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
          req.flash('transfererror', 'Invalid transfer amount');
          return res.redirect('/transfer');
          
        }
  
        // Check for sufficient balance
        if (loggedUser.balance - transferAmount < 0) {
          req.flash('transfererror', 'Insufficient balance');
          return res.redirect('/transfer');
        }
  
        // Find target user by account number
        const targetAccountObj = await User.findOne({ accountNumber });
        if (!targetAccountObj) {
          req.flash('transfererror', 'Account number not found');
          return res.redirect('/transfer');
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
        const senderHistory = new transactionHistory({
          sender: loggedUser.accountNumber,
          receiver: targetAccountObj.accountNumber,
          senderName: loggedUser.name,
          receiverName: targetAccountObj.name,
          amount: transferAmount,
          transactionType: "Transfer (CR)",
        });
        await senderHistory.save();

        const receiverHistory = new transactionHistory({
          sender: targetAccountObj.accountNumber,
          receiver: loggedUser.accountNumber,
          senderName: targetAccountObj.name,
          receiverName: loggedUser.name,
          amount: transferAmount,
          transactionType: "Transfer (DB)",
        });
        await receiverHistory.save();
  
        res.redirect('/transfer?success=true');

  
        console.log(`User ${loggedUser.name} transferred ${transferAmount} to account ${targetAccountObj.accountNumber}`);
      } catch (error) {
        console.error("Error processing transfer:", error);
        res.status(500).send("An error occurred while processing your request.");
      }
    } else {
      res.redirect("/login");
    }
  });
  
  router.get("/transactions", async (req, res) => {
    if (req.isAuthenticated()) {
      try {
        const loggedUser = await User.findById(req.session.passport.user);
        const transactions = await transactionHistory.find({ sender: loggedUser.accountNumber }).sort({ date: -1 });
        res.render("transactions", {
          title: "Trustly - Transactions History",
          showHeader: false,
          showFooter: false,
          showDashboardNav: true,
          loggedUser,
          transactions,
        });
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send("An error occurred while loading the saved accounts.");
      }
    } else {
      res.redirect("/login");
    }
  });

  router.get('/transactions/invoice/:id', async (req, res) => {
    if (req.isAuthenticated()) {
      try {
        const transaction = await transactionHistory.findById(req.params.id);
  
        if (!transaction) {
          return res.status(404).send("Transaction not found");
        }
  
        // Create a new PDF document
        const doc = new PDFDocument({
          size: [297.64, 420.94],
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });
  
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=invoice-${transaction._id}.pdf`);
  
        // Pipe the PDF document to the response
        doc.pipe(res);
  
        // Set the background color to black
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#000000');
  
        // Add the Trustly logo
        const logoPath = path.join(__dirname, '..', 'public', 'assets', 'trustly-logo.png');
        doc.image(logoPath, doc.page.width / 2 - 50, 50, { width: 100 });
  
        // Set font color to white
        doc.fillColor('#FFFFFF');
  
  
        // Add some space
        doc.moveDown(5);
  
        // Transaction details section
        doc.fontSize(16).text('Transaction Details', { underline: true });
        doc.moveDown(1);
  
        // Display transaction details in a nicely formatted way
        doc.fontSize(12).text(`Date: ${transaction.date.toISOString().slice(0, 10)}`);
        doc.text(`Transaction ID: ${transaction._id}`);
        doc.text(`Account: ${transaction.receiver} (${transaction.receiverName})`);
        doc.text(`Transaction Type: ${transaction.transactionType}`);
        doc.text(`Amount: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transaction.amount)}`);
        doc.moveDown(2);
  
        // Add a footer
        doc.text('When Trust Meets Finance', {
          align: 'center',
          valign: 'bottom',
          baseline: 'bottom',
        });
  
        // Finalize the PDF and end the stream
        doc.end();
  
      } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('An error occurred while generating the invoice.');
      }
    } else {
      res.redirect('/login');
    }
  });

  router.get("/savedAccounts", async (req, res) => {
    if (req.isAuthenticated()) {
      try {
        const loggedUser = await User.findById(req.session.passport.user).populate('savedAccounts.ownerId');
        const savedAccounts = loggedUser.savedAccounts;
        res.render("savedAccounts", {
          title: "Trustly - Saved Accounts",
          showHeader: false,
          showFooter: false,
          showDashboardNav: true,
          loggedUser,
          savedAccounts,
          messages: req.flash('messages'),
        });
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send("An error occurred while loading the saved accounts.");
      }
    } else {
      res.redirect("/login");
    }
  });
  
  router.post("/api/addAccount", async (req, res) => {
    if (req.isAuthenticated()) {
      try {
        const loggedUser = await User.findById(req.session.passport.user);
        const { accountNumber } = req.body;
  
        let messages = [];
  
        if (loggedUser.accountNumber === Number(accountNumber)) {
          messages.push('You cannot add your own account number.');
        }
  
        const isAlreadySaved = loggedUser.savedAccounts.some(
          acc => acc.accountNumber === Number(accountNumber)
        );
  
        if (isAlreadySaved) {
          messages.push('This account number is already saved.');
        }
  
        const accountOwner = await User.findOne({ accountNumber: Number(accountNumber) });
  
        if (!accountOwner) {
          messages.push('No user found with this account number.');
        }
  
        if (messages.length > 0) {
          req.flash('messages', messages);
          return res.redirect("/savedAccounts");
        }
  
        await User.findByIdAndUpdate(loggedUser._id, {
          $push: {
            savedAccounts: { accountNumber: Number(accountNumber), ownerId: accountOwner._id }
          }
        });
  
        req.flash('messages', ['Account added successfully.']);
        res.redirect("/savedAccounts");
      } catch (error) {
        console.error("Error adding account:", error);
        req.flash('messages', ['An error occurred while adding the account.']);
        res.status(500).redirect("/savedAccounts");
      }
    } else {
      res.redirect("/login");
    }
  });
  

  
module.exports = router;
