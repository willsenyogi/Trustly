const mongoose = require("mongoose");

const transactionHistorySchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true
    },
    receiver : {
        type: String,
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    receiverName: {
        type: String,
        required: true
    },
    transactionType: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("transactionHistory", transactionHistorySchema)