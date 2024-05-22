const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
    res.render("homepage", { title: "Trustly - When Trust Meets Finance" });
});

router.get("/login", async (req, res) => {
    res.render("login", { title: "Trustly - Login", showHeader: false });
});

module.exports = router