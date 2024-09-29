const express = require("express");
const router = express.Router();
const User = require("../model/user");
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");
const path = require("path");
const transactionHistory = require("../model/transactionHistory");

router.get("/", async (req, res) => {
  res.render("homepage", {
    title: "Trustly - When Trust Meets Finance",
    showDashboardNav: false,
  });
});

router.get("/promos", async (req, res) => {
  res.render("promos", {
    title: "Trustly - Debit Card Promos",
    showDashboardNav: false,
  });
});

router.get("/dashboard", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(req.session.passport.user);
      const transactions = await transactionHistory
        .find({ sender: loggedUser.accountNumber })
        .sort({ date: -1 });
      const userSavings = loggedUser.savings;

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
        userSavings,
        wdMessages: req.flash("wdMessages"),
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
        profileNotifications: req.flash("profile-notification"),
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
      const loggedUser = await User.findById(
        req.session.passport.user
      ).populate("savedAccounts.ownerId");
      const savedAccounts = loggedUser.savedAccounts;
      res.render("transfer", {
        title: "Trustly - Transfer",
        showHeader: false,
        showFooter: false,
        showDashboardNav: true,
        loggedUser,
        savedAccounts,
        transfererror: req.flash("transfererror"),
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).send("An error occurred while loading the transfer.");
    }
  } else {
    res.redirect("/login");
  }
});

router.post("/transfer", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(req.session.passport.user);
      const { accountNumber, transferAmount, accesscode } = req.body;

      // Check if transferAmount is valid
      if (isNaN(transferAmount) || transferAmount <= 0) {
        req.flash("transfererror", "Invalid transfer amount");
        return res.redirect("/transfer");
      }

      const isCodeMatch = await bcrypt.compare(accesscode, loggedUser.accesscode);
      if (!isCodeMatch) {
        req.flash("transfererror", "Incorrect access code");
        return res.redirect("/transfer");
      }

      // Check for sufficient balance
      if (loggedUser.balance - transferAmount < 0) {
        req.flash("transfererror", "Insufficient balance");
        return res.redirect("/transfer");
      }

      // Find target user by account number
      const targetAccountObj = await User.findOne({ accountNumber });
      if (!targetAccountObj) {
        req.flash("transfererror", "Account number not found");
        return res.redirect("/transfer");
      }

      // Log the balances before update
      console.log(
        `Before Transfer - Sender Balance: ${loggedUser.balance}, Receiver Balance: ${targetAccountObj.balance}`
      );

      // Update balances
      loggedUser.balance -= Number(transferAmount);
      targetAccountObj.balance += Number(transferAmount);

      // Save changes
      await loggedUser.save();
      await targetAccountObj.save();

      // Log the balances after update
      console.log(
        `After Transfer - Sender Balance: ${loggedUser.balance}, Receiver Balance: ${targetAccountObj.balance}`
      );

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

      res.redirect("/transfer?success=true");

      console.log(
        `User ${loggedUser.name} transferred ${transferAmount} to account ${targetAccountObj.accountNumber}`
      );
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
      const transactions = await transactionHistory
        .find({ sender: loggedUser.accountNumber })
        .sort({ date: -1 });
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
      res
        .status(500)
        .send("An error occurred while loading the saved accounts.");
    }
  } else {
    res.redirect("/login");
  }
});

router.get("/transactions/invoice/:id", async (req, res) => {
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
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename=invoice-${transaction._id}.pdf`
      );

      // Pipe the PDF document to the response
      doc.pipe(res);

      // Set the background color to black
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#000000");

      // Add the Trustly logo
      const logoPath = path.join(
        __dirname,
        "..",
        "public",
        "assets",
        "trustly-logo.png"
      );
      doc.image(logoPath, doc.page.width / 2 - 50, 50, { width: 100 });

      // Set font color to white
      doc.fillColor("#FFFFFF");

      // Add some space
      doc.moveDown(5);

      // Transaction details section
      doc.fontSize(16).text("Transaction Details", { underline: true });
      doc.moveDown(1);

      // Display transaction details in a nicely formatted way
      doc
        .fontSize(12)
        .text(`Date: ${transaction.date.toISOString().slice(0, 10)}`);
      doc.text(`Transaction ID: ${transaction._id}`);
      doc.text(
        `Account: ${transaction.receiver} (${transaction.receiverName})`
      );
      doc.text(`Transaction Type: ${transaction.transactionType}`);
      doc.text(
        `Amount: ${new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(transaction.amount)}`
      );
      doc.moveDown(2);

      // Add a footer
      doc.text("When Trust Meets Finance", {
        align: "center",
        valign: "bottom",
        baseline: "bottom",
      });

      // Finalize the PDF and end the stream
      doc.end();
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).send("An error occurred while generating the invoice.");
    }
  } else {
    res.redirect("/login");
  }
});

router.get("/savedAccounts", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(
        req.session.passport.user
      ).populate("savedAccounts.ownerId");
      const savedAccounts = loggedUser.savedAccounts;
      res.render("savedAccounts", {
        title: "Trustly - Saved Accounts",
        showHeader: false,
        showFooter: false,
        showDashboardNav: true,
        loggedUser,
        savedAccounts,
        messages: req.flash("messages"),
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res
        .status(500)
        .send("An error occurred while loading the saved accounts.");
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
        messages.push("You cannot add your own account number.");
      }

      const isAlreadySaved = loggedUser.savedAccounts.some(
        (acc) => acc.accountNumber === Number(accountNumber)
      );

      if (isAlreadySaved) {
        messages.push("This account number is already saved.");
      }

      const accountOwner = await User.findOne({
        accountNumber: Number(accountNumber),
      });

      if (!accountOwner) {
        messages.push("No user found with this account number.");
      }

      if (messages.length > 0) {
        req.flash("messages", messages);
        return res.redirect("/savedAccounts");
      }

      await User.findByIdAndUpdate(loggedUser._id, {
        $push: {
          savedAccounts: {
            accountNumber: Number(accountNumber),
            ownerId: accountOwner._id,
          },
        },
      });

      req.flash("messages", ["Account added successfully."]);
      res.redirect("/savedAccounts");
    } catch (error) {
      console.error("Error adding account:", error);
      req.flash("messages", ["An error occurred while adding the account."]);
      res.status(500).redirect("/savedAccounts");
    }
  } else {
    res.redirect("/login");
  }
});

router.get("/addfunds/savings", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(req.session.passport.user);
      res.render("addfunds", {
        title: "Trustly - Add Funds",
        showHeader: false,
        showFooter: false,
        showDashboardNav: true,
        loggedUser,
        sdMessages: req.flash("sdMessages"),
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res
        .status(500)
        .send("An error occurred while loading the add funds page.");
    }
  } else {
    res.redirect("/login");
  }
});

router.post("/api/addfunds/savings", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(req.session.passport.user);
      const { savingsAmount, savingsTitle, savingsTarget, accesscode } = req.body;

      if (savingsAmount > loggedUser.balance) {
        req.flash("sdMessages", ["Insufficient funds."]);
        return res.redirect("/addfunds/savings");
      }

      const isCodeMatch = await bcrypt.compare(accesscode, loggedUser.accesscode);
      if (!isCodeMatch) {
        req.flash("sdMessages", ["Incorrect access code"]);
        return res.redirect("/addfunds/savings");
      }

      loggedUser.balance -= Number(savingsAmount);
      loggedUser.savingsAmount += Number(savingsAmount);
      loggedUser.savingsTitle = savingsTitle || loggedUser.savingsTitle;  // Update if provided
      loggedUser.savingsTarget = savingsTarget || loggedUser.savingsTarget;  // Update if provided
      await loggedUser.save();

      req.flash("sdMessages", ["Savings added successfully."]);
      
      const history = new transactionHistory({
        sender: loggedUser.accountNumber,
        senderName: loggedUser.name,
        receiver: loggedUser.accountNumber,
        receiverName: "Savings (" + (savingsTitle || "N/A") + ")",
        transactionType: "Savings Deposit (CR)",
        amount: savingsAmount || 0,
      });

      await history.save(); // Ensure transaction history is saved
      
      res.redirect("/addfunds/savings?success=true");  // Redirect with success query parameter
    } catch (error) {
      console.error("Error adding savings:", error);
      req.flash("sdMessages", ["An error occurred while adding the savings."]);
      res.status(500).redirect("/addfunds/savings");
    }
  } else {
    res.redirect("/login");
  }
});

router.post("/api/addfunds/withdrawsavings/close", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const loggedUser = await User.findById(req.session.passport.user);
      const { savingsAmount, savingsTitle, savingsTarget, accesscode } = req.body;

      // Check the access code
      const isCodeMatch = await bcrypt.compare(accesscode, loggedUser.accesscode);
      if (!isCodeMatch) {
        req.flash("wdMessages", ["Incorrect access code"]);
        return res.redirect("/dashboard");
      }

      if (savingsAmount > loggedUser.savingsAmount) {
        req.flash("wdMessages", ["Insufficient funds."]);
        return res.redirect("/dashboard");
      }

      loggedUser.savingsAmount -= Number(savingsAmount);
      loggedUser.balance += Number(savingsAmount);
      loggedUser.savingsTarget = 0;
      const history = new transactionHistory({
        sender: loggedUser.accountNumber,
        senderName: loggedUser.name,
        receiver: loggedUser.accountNumber,
        receiverName: "Savings (" + (savingsTitle || "N/A") + ")",
        transactionType: "Savings Withdrawal (DB)",
        amount: savingsAmount,
      });
      loggedUser.savingsTitle = "";
      await loggedUser.save();
      await history.save();

      req.flash("wdMessages", ["Savings withdrawn successfully."]);
      res.redirect("/dashboard?success=true");
    } catch (error) {
      console.error("Error withdrawing savings:", error);
      req.flash("wdMessages", ["An error occurred while withdrawing the savings."]);
      res.status(500).redirect("/dashboard");
    }
  } else {
    res.redirect("/login");
  }
});

router.get("/addfunds/savings/withdraw", async (req, res) => {
  try {
   if (req.isAuthenticated()) {
    const loggedUser = await User.findById(req.session.passport.user);
    res.render("withdrawsavings", {
      title: "Trustly - Withdraw Funds",
      showHeader: false,
      showFooter: false,
      showDashboardNav: true,
      loggedUser,
      wdsMessages: req.flash("wdsMessages"),
    });
   } else {
    res.redirect("/login");
   }
  } catch (error) {
    console.error("Error loading withdraw savings page:", error);
    res.status(500).send("An error occurred while loading the withdraw savings page.");
  }
});

router.post("/api/addfunds/savings/withdraw", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
        const loggedUser = await User.findById(req.session.passport.user);
        const { withdrawAmount, savingsTitle, savingsTarget, accesscode } = req.body;
        const isCodeMatch = await bcrypt.compare(accesscode, loggedUser.accesscode);
        if (!isCodeMatch) {
          req.flash("wdsMessages", ["Incorrect access code"]);
          return res.redirect("/addfunds/savings/withdraw");
        }

        if (withdrawAmount > loggedUser.savingsAmount) {
          req.flash("wdsMessages", ["Insufficient funds."]);
          return res.redirect("/addfunds/savings/withdraw");
        }

        loggedUser.savingsAmount -= Number(withdrawAmount);
        loggedUser.balance += Number(withdrawAmount);
        const history = new transactionHistory({
          sender: loggedUser.accountNumber,
          senderName: loggedUser.name,
          receiver: loggedUser.accountNumber,
          receiverName: "Savings (" + (savingsTitle || "N/A") + ")",
          transactionType: "Savings Withdrawal (DB)",
          amount: withdrawAmount,
        });
        await loggedUser.save();
        await history.save();
        req.flash("wdsMessages", ["Savings withdrawn successfully."]);
        res.redirect("/addfunds/savings/withdraw?success=true");
      } else {
        res.redirect("/login");
    }
  } catch (error) {
    console.error("Error withdrawing savings:", error);
    req.flash("wdsMessages", ["An error occurred while withdrawing the savings."]);
    res.status(500).redirect("/addfunds/savings/withdraw");
  }
  
});

module.exports = router;
