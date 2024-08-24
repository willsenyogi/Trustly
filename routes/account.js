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

      const formatDate = (timestamp) => {
        const date = new Date(timestamp);

        return new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(date);
      };

      const formattedDate = formatDate(Date.now());

      sendMail(
        loggedUser.email,
        `Password Changed`,
        `Your password has been changed at ${formattedDate}`
      );

      req.flash("profile-notification", ["You just changed your password"]);
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
      sendMail(loggedUser.email, "OTP Code for password reset", "Your OTP code is: " + otp);
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
        req.flash("fgprMessages", ["Incorrect OTP code. New OTP code sent."]);
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
        );

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

        const formatDate = (timestamp) => {
          const date = new Date(timestamp);

          return new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(date);
        };

        const formattedDate = formatDate(Date.now());

        sendMail(
          loggedUser.email,
          `Password Changed`,
          `Your password has been changed at ${formattedDate}`
        );

        req.flash("profile-notification", ["You just changed your password"]);
        res.redirect("/profile");
      } else {
        res.redirect("/login");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).send("An error occurred while changing the password.");
    }
  }
);

router.get("/profile/changeemail", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      res.render("changeemail", {
        title: "Trustly - Change Email",
        showHeader: false,
        showFooter: false,
        showDashboardNav: false,
        loggedUser,
        ceMessages: req.flash("ceMessages"),
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error loading change email page:", error);
    res
      .status(500)
      .send("An error occurred while loading the change email page.");
  }
});

router.post("/profile/api/resetpassword/submit", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      const allUsers = await User.find({});
      const { newemail, password, accesscode } = req.body;

      if (!newemail) {
        req.flash("ceMessages", ["Please enter a new email."]);
        return res.redirect("/profile/changeemail");
      }

      if (newemail === loggedUser.email) {
        req.flash("ceMessages", [
          "New email cannot be the same as the old one.",
        ]);
        return res.redirect("/profile/changeemail");
      }

      if (allUsers.some((user) => user.email === newemail)) {
        req.flash("ceMessages", ["Email already exists."]);
        return res.redirect("/profile/changeemail");
      }
      const isPasswordCorrect = await bcrypt.compare(
        password,
        loggedUser.password
      );
      const isAccessCodeCorrect = await bcrypt.compare(
        accesscode,
        loggedUser.accesscode
      );
      if (!isPasswordCorrect || !isAccessCodeCorrect) {
        req.flash("ceMessages", ["Incorrect password or access code."]);
        return res.redirect("/profile/changeemail");
      }
      const formatDate = (timestamp) => {
        const date = new Date(timestamp);

        return new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(date);
      };

      const formattedDate = formatDate(Date.now());

      sendMail(
        loggedUser.email,
        `Your email address has been changed at ${formattedDate}`,
        `Your new email address is ${newemail}.`
      );
      loggedUser.email = newemail;
      await loggedUser.save();
      req.flash("profile-notification", [
        "You just changed your email address",
      ]);
      res.redirect("/profile");
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error changing email:", error);
    res.status(500).send("An error occurred while changing the email.");
  }
});

router.get("/profile/changeaccesscode", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      const otp = Math.floor(1000 + Math.random() * 9000);
      req.session.cacotp = otp.toString(); 
      sendMail(
        loggedUser.email,
        `Your One-Time Password (OTP) for access code change`,
        `Your One-Time Password (OTP) is ${otp}`
      );

      res.render("changeaccesscode", {
        title: "Trustly - Change Access Code",
        showHeader: false,
        showFooter: false,
        showDashboardNav: false,
        loggedUser,
        cacMessages: req.flash("cacMessages"),
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error loading change access code page:", error);
    res.status(500).send("An error occurred while loading page.");
  }
});

router.post("/api/profile/resetaccesscode/otpconfirm", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const loggedUser = await User.findById(req.session.passport.user);
      const { cacotp } = req.body;

      if (req.session.cacotp !== cacotp) {
        req.flash("cacMessages", ["Invalid OTP. New OTP code sent."]);
        return res.redirect("/profile/changeaccesscode");
      } else {
        res.redirect("/profile/resetaccesscode/otpconfirm/true");
      }
      
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error changing access code:", error);
    res.status(500).send("An error occurred while changing the access code.");
  }
});

router.get("/profile/resetaccesscode/otpconfirm/true", async (req, res) => {
    try {
        if (req.isAuthenticated()) {
            const loggedUser = await User.findById(req.session.passport.user);
            res.render("changeaccesscode-otpconfirmed", {
                title: "Trustly - Reset Access Code",
                showHeader: false,
                showFooter: false,
                showDashboardNav: false,
                loggedUser,
                cac2Messages: req.flash("cac2Messages"),
            });
        } else {
            res.redirect("/login");
        }
    } catch (error) {
        console.error("Error loading reset access code page:", error);
        res.status(500).send("An error occurred while loading page.");
    }
});

router.post("/api/profile/resetaccesscode/otpconfirm/true/change", async (req, res) => {
    try {
        if (req.isAuthenticated()) {
            const loggedUser = await User.findById(req.session.passport.user);
            const { oldaccesscode,newaccesscode } = req.body;
            const isOldCodeMatch = await bcrypt.compare(oldaccesscode, loggedUser.accesscode);
            const isNewCodeMatch = await bcrypt.compare(newaccesscode, loggedUser.accesscode);

            if (!isOldCodeMatch) {
                req.flash("cac2Messages", ["Incorrect old access code. Please try again."]);
                return res.redirect("/profile/resetaccesscode/otpconfirm/true");
            }
            if (isNewCodeMatch) {
                req.flash("cac2Messages", ["New access code cannot be the same as old access code. Please try again."]);
                return res.redirect("/profile/resetaccesscode/otpconfirm/true");
            }
            if (oldaccesscode === newaccesscode) {
                req.flash("cac2Messages", ["New access code cannot be the same as old access code. Please try again."]);
                return res.redirect("/profile/resetaccesscode/otpconfirm/true");
            }
            if(newaccesscode.length < 6) {
                req.flash("cac2Messages", ["New access code must be at least 6 characters long. Please try again."]);
                return res.redirect("/profile/resetaccesscode/otpconfirm/true");
            }

            const newaccesscodeHash = await bcrypt.hash(newaccesscode, 10);
            loggedUser.accesscode = newaccesscodeHash;
            await loggedUser.save();
            req.session.cacotp = null;
            req.session.save();
           
            const formatDate = (timestamp) => {
                const date = new Date(timestamp);
        
                return new Intl.DateTimeFormat("id-ID", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }).format(date);
              };
        
              const formattedDate = formatDate(Date.now());
        
              sendMail(
                loggedUser.email,
                `Your access code has been changed`,
                `Your access code has been changed at ${formattedDate}`
              );

            req.flash("profile-notification", ["You just changed your access code"]);
            res.redirect("/profile");
        } else {
            res.redirect("/login");
        }
    } catch (error) {
        console.error("Error changing access code:", error);
        res.status(500).send("An error occurred while changing the access code.");
    }
}); 
        

module.exports = router;
