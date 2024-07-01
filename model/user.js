const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
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
    token: {
        type: String,
        default: "112233",
        required: true
    }
});

module.exports = mongoose.model("users", userSchema)