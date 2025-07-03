const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: {
        type: String,
        required: true,
        unique: true,
    },
    stocks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock",
    }],
});

module.exports = mongoose.model("Watchlist", watchlistSchema);