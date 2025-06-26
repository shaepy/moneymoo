const express = require("express");
const Portfolio = require("../models/portfolio.js");
const User = require("../models/user.js");
const Trade = require("../models/trade.js");
const Stock = require("../models/stock.js");
const router = express.Router();
const isSignedIn = require('../middleware/is-signed-in.js');

// TODO-ST: need to update the price periodically

router.get('/', isSignedIn, async (req, res) => {
    const portfolioId = req.query.id;
    const user = await User.findById(req.session.user._id).populate('portfolios');

    if (portfolioId) {
        const portfolio = await Portfolio.findById(portfolioId).populate('userStocks.stock');
        console.log('the matching portfolio is:', portfolio);
        return res.render('portfolio/index', {
            portfolios: null,
            activePortfolio: portfolio
        });
    };

    if (user.portfolios.length > 0) {
        const portfolioTotalSum = user.portfolios.reduce((total, portfolio) => {
            return total + portfolio.totalValue;
        }, 0);
        console.log('portfolioTotalSum:', portfolioTotalSum);

        res.render('portfolio/index', {
            portfolios: user.portfolios,
            activePortfolio: null,
            portfolioTotalSum
        });
    } else {
        res.render('portfolio/index', {
            portfolios: null,
            activePortfolio: null,
        });
    };
});

router.get('/new', isSignedIn, (req, res) => {
    res.render('portfolio/new');
});

router.get('/:portfolioId/trade/new', isSignedIn, async (req, res) => {    
    const portfolio = await Portfolio.findById(req.params.portfolioId)
    res.render('portfolio/trade/new', { portfolio });
});

router.post('/', async (req, res) => {
    const portfolio = await Portfolio.create({
        userId: req.session.user._id,
        name: req.body.name,
        totalValue: 0
    });
    const user = await User.findById(req.session.user._id);
    user.portfolios.push(portfolio._id)
    await user.save();
    res.redirect('/portfolio');
});

// make a new trade here
router.post('/:portfolioId', async (req, res) => {
    const portfolio = await Portfolio.findById(req.params.portfolioId).populate('userStocks.stock');
    console.log('portfolio:', portfolio)
    console.log('portfolio.totalValue currently at:', portfolio.totalValue)

    // !HANDLE COMMAS from the price or quantity (no 1,535 passed)
    const { type, symbol, date, quantity, price, notes } = req.body;
    const tradeDate = new Date(date);

    // TODO-ST we need to handle a condition of "BUY" or "SELL" for trade types
    // right now we only support BUY

    let stock = await Stock.findOne({ symbol: symbol });
    console.log('did we find a stock?:', stock);

    // stock does not exist, find from API and create one
    if (!stock) {
        const newStock = await getStockFromAPI(symbol);
        console.log('data returned from API', newStock);
        stock = await Stock.create(newStock[0]);
        console.log('new stock created:', stock);
    };

    const trades = await Trade.find({
            $and: [{ stock: stock._id }, { portfolioId: portfolio._id }]
        });
    console.log('trades found?:', trades);
    
    // add the new trade
    const trade = await Trade.create({
        type: type.toLowerCase(),
        stock: stock._id,
        date: tradeDate,
        quantity: Number(quantity),
        price: Number(price),
        notes: notes ? notes : null,
        portfolioId: portfolio._id
    });
    console.log('created new trade:', trade);

    if (trades.length > 0) {
        console.log('this stock exists, and already in this portfolio');
        const currentTotalAmount = trades.reduce((total, trade) => {
            return total + (trade.quantity * trade.price);
        }, 0);
        console.log('currentTotalAmount:', currentTotalAmount);

        const currentTotalNumOfShares = trades.reduce((total, trade) => {
            return total + trade.quantity;
        }, 0);
        console.log('currentTotalNumOfShares:', currentTotalNumOfShares);

        const newTotalCost = currentTotalAmount + (trade.quantity * trade.price);
        console.log('newTotalCost:', newTotalCost);
        const newTotalQuantity = currentTotalNumOfShares + trade.quantity;
        console.log('newTotalQuantity:', newTotalQuantity);
        const newAvgCostBasis = (newTotalCost / newTotalQuantity);
        console.log('newAvgCostBasis:', newAvgCostBasis);

        // find the existing stock
        const userStock = portfolio.userStocks.find((userSt) => {
            return userSt.stock._id.toString() === stock._id.toString();
        });
        console.log('found the stock in portfolio:', userStock);

        userStock.set({
            costBasis: newAvgCostBasis,
            quantity: newTotalQuantity,
            totalCost: newTotalCost
        });

    } else {
        // stock exists, but not in this portfolio
        console.log('this stock exists, but not yet in this portfolio. using new price and qt');
        const userStock = {
            stock: stock._id,
            costBasis: Number(price),
            quantity: Number(quantity),
            totalCost: Number(price) * Number(quantity)
        };
        console.log('new userStock is:', userStock);
        portfolio.userStocks.push(userStock);
    };

    portfolio.trades.push(trade);
    // !this only adds the portfolio value but we need a function that actually CALCULATES the value
    portfolio.totalValue += Number(quantity) * stock.price;

    await portfolio.save();
    console.log('portfolio is updated:', portfolio);

    res.redirect(`/portfolio?id=${req.params.portfolioId}`);
});

const getStockFromAPI = async (symbol) => {
    const stock = await fetch(
        `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${process.env.FMP_APIKEY}`
    );
    if (!stock.ok) throw new Error("Failed to fetch stock data");
    return await stock.json();
};

// function to update portfolio value

module.exports = router;