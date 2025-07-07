const Portfolio = require("../../models/portfolio.js");
const Watchlist = require("../../models/watchlist.js");
const User = require("../../models/user.js")

// userId = req.session.user._id
const getUserFromDatabase = async (userId) => {
    const user = await User.find(userId);
    console.log('USER IS:', user);
    return user;
};

const getUserPortfolios = async (userId) => {
    const userPortfolios = await Portfolio.find({ userId: userId }).populate("userStocks.stock");
    console.log('USER PORTFOLIOS:', userPortfolios);
    return userPortfolios;
};

const getUserWatchlists = async (userId) => {
    const userWatchlists = await Watchlist.find({ userId: userId }).populate("stocks");
    console.log('USER WATCHLISTS:', userWatchlists);
    return userWatchlists;
};


module.exports = {
    getUserPortfolios,
    getUserWatchlists,
};