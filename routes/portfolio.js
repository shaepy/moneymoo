const express = require("express");
const Portfolio = require("../models/portfolio.js");
const User = require("../models/user.js");
const Trade = require("../models/trade.js");
const Stock = require("../models/stock.js");
const router = express.Router();
const isSignedIn = require('../middleware/is-signed-in.js');

// TODO-ST: need to update the price periodically

router.get('/', isSignedIn, async (req, res) => {
    const user = await User.findById(req.session.user._id).populate('portfolios');

    if (req.query.id) {
        const portfolio = await Portfolio.findById(req.query.id).populate('userStocks.stock');
        return res.render('portfolio/index', {
            portfolios: null,
            activePortfolio: portfolio
        });
    };

    if (user.portfolios.length > 0) {
        const portfolioTotalSum = user.portfolios.reduce((total, portfolio) => {
            return total + portfolio.totalValue;
        }, 0);
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

// !HANDLE COMMAS from the price or quantity (no 1,535 passed)
// TODO-ST: quantity <= 0 should remove userStock from portfolio

router.post('/:portfolioId', async (req, res) => {
    const { type, symbol, date, quantity, price, notes } = req.body;
    const tradeDate = new Date(date);
    const portfolio = await Portfolio.findById(req.params.portfolioId).populate('userStocks.stock');

    let stock = await Stock.findOne({ symbol: symbol });
    console.log('did we find a stock?:', stock);

    if (!stock) stock = await createStockFromAPI(symbol);

    const trades = await Trade.find({ $and: [{ stock: stock._id }, { portfolioId: portfolio._id }] });
    console.log('trades found?:', trades);

    if (type.toLowerCase() === 'sell' && trades.length <= 0) {
        console.log(`This is an INVALID trade. type==='sell' but NO trades found`);
        return res.redirect(`/portfolio?id=${req.params.portfolioId}`);
    };
    
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
        // check for BUY or SELL
        await handleTradeType(portfolio, trades, trade, stock);
    } else {
        const userStock = {
            stock: stock._id,
            costBasis: Number(price),
            quantity: Number(quantity),
            totalCost: Number(price) * Number(quantity)
        };
        portfolio.userStocks.push(userStock);
    };

    portfolio.trades.push(trade);
    await portfolio.save();
    await updatePortfolioValue(portfolio._id);

    res.redirect(`/portfolio?id=${req.params.portfolioId}`);
});

const createStockFromAPI = async (symbol) => {
    let stock = await fetch(
        `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${process.env.FMP_APIKEY}`
    );
    if (!stock.ok) throw new Error("Failed to fetch stock data");
    stock = await stock.json();
    console.log('API response stock.json:', stock);
    return await Stock.create(stock[0]);
};

const updatePortfolioValue = async (portfolioId) => {
    const portfolio = await Portfolio.findById(portfolioId).populate('userStocks.stock');
    console.log('portfolio is:', portfolio)

    const totalSum = portfolio.userStocks.reduce((total, userStock) => {
        console.log('userStock.quantity:', userStock.quantity);
        console.log('userStock.stock.price:', userStock.stock.price);
        return total + (userStock.quantity * userStock.stock.price);
    }, 0);

    console.log('totalSum:', totalSum);
    portfolio.totalValue = totalSum;
    await portfolio.save();
};

const calculateCurrentTotals = (trades) => {
    const currentTotalCost = trades.reduce((total, trade) => total + (trade.quantity * trade.price), 0);
    console.log('currentTotalCost:', currentTotalCost);
    const currentTotalNumOfShares = trades.reduce((total, trade) => total + trade.quantity, 0);
    console.log('currentTotalNumOfShares:', currentTotalNumOfShares);

    return { currentTotalCost, currentTotalNumOfShares };
};

const calculateNewTotals = (currentTotalCost, currentTotalNumOfShares, trade) => {
    const newTotalCost = currentTotalCost + (trade.quantity * trade.price);
    console.log('newTotalCost:', newTotalCost);
    const newTotalQuantity = currentTotalNumOfShares + trade.quantity;
    console.log('newTotalQuantity:', newTotalQuantity);
    const newAvgCostBasis = (newTotalCost / newTotalQuantity);
    console.log('newAvgCostBasis:', newAvgCostBasis);

    return { newTotalCost, newTotalQuantity, newAvgCostBasis };
};

const handleTradeType = async (portfolio, trades, trade, stock) => {
    const userStock = portfolio.userStocks.find((userSt) => {
        return userSt.stock._id.toString() === stock._id.toString();
    });

    if (trade.type.toLowerCase() === 'buy') {
        console.log('this is a BUY trade')
        const { currentTotalCost, currentTotalNumOfShares } = calculateCurrentTotals(trades);
        const { newAvgCostBasis, newTotalQuantity, newTotalCost } = calculateNewTotals(currentTotalCost, currentTotalNumOfShares, trade);

        userStock.set({
            costBasis: newAvgCostBasis,
            quantity: newTotalQuantity,
            totalCost: newTotalCost
        });
    } else {
        console.log('this is a SELL trade')
        userStock.set({ 
            quantity: userStock.quantity - trade.quantity,
            totalCost: userStock.totalCost - (userStock.costBasis * trade.quantity)
         });
    };
};

module.exports = router;