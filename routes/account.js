const express = require("express");
const router = express.Router();
const User = require("../model/user");
const bcrypt = require("bcryptjs");
const sendMail = require("../controller/otpmailer");

router.get("/resetpassword", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      res.render("resetpassword", {
        title: "Trustly - Forgot Password",
        showHeader: false,
        showFooter: false,
        showDashboardNav: false,
        loggedUser,
        resError: req.flash("resError"),
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error loading forgot password page:", error);
    res
      .status(500)
      .send("An error occurred while loading the forgot password page.");
  }
});

router.post("/api/resetpassword/submit", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      const { oldpassword, newpassword } = req.body;

      const isPasswordMatch = await bcrypt.compare(
        oldpassword,
        loggedUser.password
      );

      if (!isPasswordMatch) {
        req.flash("resError", ["Incorrect password."]);
        return res.redirect("/resetpassword");
      }

      if (newpassword.length < 8) {
        req.flash("resError", ["Password must be at least 8 characters long."]);
        return res.redirect("/resetpassword");
      }

      const isNewPasswordSame = await bcrypt.compare(
        newpassword,
        loggedUser.password
      );

      if (isNewPasswordSame) {
        req.flash("resError", [
          "New password cannot be the same as the old one.",
        ]);
        return res.redirect("/resetpassword");
      }

      loggedUser.password = await bcrypt.hash(newpassword, 10);

      await loggedUser.save();

      req.flash("success", ["Password changed successfully."]);
      res.redirect("/profile");
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).send("An error occurred while resetting the password.");
  }
});

router.get("/forgotpassword/pr", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      const otp = Math.floor(100000 + Math.random() * 900000);
      req.session.otpfgpr = otp;
      req.session.save();
      sendMail(loggedUser.email, "OTP Code", "Your OTP code is: " + otp);
      res.render("forgotpassword-pr", {
        title: "Trustly - Forgot Password",
        showHeader: false,
        showFooter: false,
        showDashboardNav: false,
        loggedUser,
        fgprMessages: req.flash("fgprMessages"),
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error loading forgot password page:", error);
    res
      .status(500)
      .send("An error occurred while loading the forgot password page.");
  }
});

router.post("/api/forgotpassword/pr/submit", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      const { otpcodepr } = req.body;
      if (String(req.session.otpfgpr) !== otpcodepr) {
        req.flash("fgprMessages", ["Incorrect OTP code."]);
        return res.redirect("/forgotpassword/pr");
      } else {
        res.redirect("/forgotpassword/pr/otpconfirmed/true");
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).send("An error occurred while changing the password.");
  }
});

router.get("/forgotpassword/pr/otpconfirmed/true", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      res.render("forgotpassword-pr-otpconfirmed", {
        title: "Trustly - Forgot Password",
        showHeader: false,
        showFooter: false,
        showDashboardNav: false,
        loggedUser,
        fgpr2Messages: req.flash("fgpr2Messages"),
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error loading forgot password page:", error);
    res
      .status(500)
      .send("An error occurred while loading the forgot password page.");
  }
});

router.post(
  "/api/forgotpassword/pr/otpconfirmed/true/change",
  async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const loggedUser = await User.findById(req.session.passport.user);
        const { newpassword } = req.body;
        if (!newpassword) {
          req.flash("fgpr2Messages", ["Please enter a new password."]);
          return res.redirect("/forgotpassword/pr/otpconfirmed/true");
        }

        if (newpassword.length < 8) {
          req.flash("fgpr2Messages", [
            "Password must be at least 8 characters long.",
          ]);
          return res.redirect("/forgotpassword/pr/otpconfirmed/true");
        }

        const isNewPasswordSame = await bcrypt.compare(
          newpassword,
          loggedUser.password
        )

        if (isNewPasswordSame) {
          req.flash("fgpr2Messages", [
            "New password cannot be the same as the old one.",
          ]);
          return res.redirect("/forgotpassword/pr/otpconfirmed/true");
        }

        loggedUser.password = await bcrypt.hash(newpassword, 10);
        await loggedUser.save();
        req.session.otpfgpr = null;
        req.session.save();
        res.redirect("/dashboard");
      } else {
        res.redirect("/login");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).send("An error occurred while changing the password.");
    }
  }
);

module.exports = router;
