const express = require("express");
const Portfolio = require("../models/portfolio.js");
const User = require("../models/user.js");
const Trade = require("../models/trade.js");
const Stock = require("../models/stock.js");
const router = express.Router();

router.get('/', async (req, res) => {
    const portfolioId = req.query.id;
    const user = await User.findById(req.session.user._id).populate('portfolios');

    if (portfolioId && user) {
        const portfolio = await Portfolio.findById(portfolioId).populate('userStocks.stock');
        console.log('the matching portfolio is:', portfolio);

        return res.render('portfolio/index', {
            portfolios: null,
            activePortfolio: portfolio
        });
    };

    if (user.portfolios) {
        const portfolioTotalSum = user.portfolios.reduce((total, portfolio) => {
            return total + portfolio.totalValue;
        }, 0);
        console.log(portfolioTotalSum)

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

router.get('/new', (req, res) => {
    res.render('portfolio/new');
});

router.get('/:portfolioId/trade/new', async (req, res) => {    
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
    const portfolio = await Portfolio.findById(req.params.portfolioId);
    console.log('portfolio:', portfolio)
    console.log('portfolio.totalValue currently at:', portfolio.totalValue)
    console.log('portfolio.totalValue typeof:', typeof portfolio.totalValue)

    // !prevent COMMAS from the price (no 1,535)
    const { type, symbol, date, quantity, price, notes } = req.body;
    const tradeDate = new Date(date);

    // TODO-ST we need to handle a condition of "BUY" or "SELL" for trade types
    // right now we only support BUY

    let stock = await Stock.findOne({ symbol: symbol });
    console.log('did we find a stock?:', stock);

    // TODO-ST handle if a stock already exists (do not need to create a new model)
    if (stock) {
        // we don't need to make a new stock.
        // we need all other trades in this portfolio with this stock
        // find trades with this stock and this portfolio
        const trades = await Trade.find({
            $and: [
                { stock: stock._id },
                { portfolioId: portfolio._id }
            ]
        });
        console.log(trades);
        // calculate cost basis from previous trades

    } else {
        const newStock = await getStockFromAPI(symbol);
        console.log('data returned from API', newStock)
        // create a new stock
        stock = await Stock.create(newStock);
        console.log('new stock created:', stock)

        const trade = await Trade.create({
            type: type.toLowerCase(),
            stock: stock[0]._id,
            date: tradeDate,
            quantity: Number(quantity),
            price: Number(price),
            notes: notes ? notes : null,
            portfolioId: portfolio._id
        });
        console.log('created new trade:', trade);
        
        // create the userStockSchema based on the new trade
        const userStock = {
            stock: stock[0]._id,
            costBasis: Number(price),
            quantity: Number(quantity),
            totalCost: Number(price) * Number(quantity)
        }

        portfolio.totalValue += Number(quantity) * stock[0].price;
        portfolio.trades.push(trade);
        portfolio.userStocks.push(userStock);
        await portfolio.save();

        console.log('portfolio is updated:', portfolio);
    }
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