const mongoose = require('mongoose');

const userStockSchema = new mongoose.Schema({
    stock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock",
        required: true,
        unique: true,
    },
    costBasis: { type: Number, required: true },
    quantity: { type: Number, required: true },
    totalCost: { type: Number, required: true },
});

const portfolioSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: {
        type: String,
        required: true,
        maxLength: 24,
        unique: true,
    },
    trades: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trade",
        unique: true,
    }],
    userStocks: [userStockSchema],
    totalValue: { type: Number },
}, {
    timestamps: true
});

module.exports = mongoose.model("Portfolio", portfolioSchema);