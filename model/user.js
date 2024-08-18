const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    accountOpened: {
        type: Date,
        default: Date.now
    },
    cardType: {
        type: String,
        enum : ["VISA", "MASTERCARD", "GPN", "AMERICAN EXPRESS"],
    },
    cardExpiry: {
        type: Date
    },
    accountNumber: {
        type: Number
    },
    cardNumber: {
        type: Number
    },
    balance: {
        type: Number,
        default: 20000000
    },
    deposit: {
        type: Number,
        default: 0
    },
    token: {
        type: String,
        default: "112233",
        required: true
    }
});

module.exports = mongoose.model("users", userSchema)