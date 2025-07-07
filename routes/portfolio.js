const express = require("express");
const Portfolio = require("../models/portfolio.js");
const User = require("../models/user.js");
const Trade = require("../models/trade.js");
const Stock = require("../models/stock.js");
const router = express.Router();
const isSignedIn = require("../middleware/is-signed-in.js");
const utils = require("../utils/serverUtils.js");

/* ------------------------- GET ROUTES ------------------------- */

router.get("/", isSignedIn, async (req, res) => {
  const portfolioId = req.query.id;
  const portfolios = await Portfolio.find({ userId: req.session.user._id}).populate("userStocks.stock");

  if (portfolioId) {
    const portfolio = await Portfolio.findById(portfolioId).populate("userStocks.stock");
    await utils.calculateMktValueAndPL(portfolio.userStocks);
    const portfolioSummary = await utils.calcPortfoliosSum(portfolio.userStocks);
    console.log('SUMMARY:', portfolioSummary);
    if (req.query.edit) portfolio.edit = true;
    return res.render("portfolio/index", {
      portfolios: portfolios,
      activePortfolio: portfolio,
      userStocks: null,
      summary: portfolioSummary
    });
  }
  const stockLists = portfolios.filter(list => list.userStocks.length > 0).map(list => list.userStocks).flat();
  console.log('CONSOLIDATED LISTS:', stockLists);

  // FIX: if no stocks are found, portfolio or not it will return here
  if (stockLists.length < 1) {
    console.log('NO STOCKS FOUND');
    return res.render('portfolio/index', {
      portfolios: portfolios,
      activePortfolio: null,
      userStocks: null,
      portfoliosSumValue: null,
      summary: null,
    });
  }
  const userStocks = [...new Set(stockLists)];
  await utils.calculateMktValueAndPL(userStocks);
  const portfoliosSum = await utils.calcPortfoliosSum(userStocks);
  console.log('PORTFOLIO SUMS:', portfoliosSum);

  // we are checking for stocks before we check for portfolios ?
  // * if there are any portfolios
  if (portfolios.length > 0) {
    const portfoliosSumValue = portfolios.reduce((total, portfolio) => {
      return total + portfolio.totalValue;
    }, 0);
    res.render("portfolio/index", {
      portfolios: portfolios,
      activePortfolio: null,
      portfoliosSumValue,
      userStocks: userStocks,
      summary: portfoliosSum,
    });
    // else there aren't any? 
  } else {
    res.render("portfolio/index", {
      portfolios: null,
      activePortfolio: null,
      userStocks: null,
      portfoliosSumValue: null,
      summary: null,
    });
  }
});

router.get("/new", isSignedIn, (req, res) => {
  res.render("portfolio/new");
});

router.get("/:portfolioId/remove", isSignedIn, async (req, res) => {
  const stockId = req.query.id;
  const portfolio = await Portfolio.findById(req.params.portfolioId).populate("userStocks.stock");
  if (stockId) {
    const userStock = portfolio.userStocks.id(stockId);
    console.log("stock:", userStock);
    res.render("portfolio/remove", {
      removePortfolio: false,
      userStock: userStock,
      portfolio,
    })
  } else {
    res.render("portfolio/remove", {
      removePortfolio: true,
      userStock: null,
      portfolio,
    });
  }
});

router.get("/:portfolioId/trades", isSignedIn, async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.portfolioId)
  .populate({
    path: 'trades',
    populate: { path: 'stock', model: 'Stock' }
  });
  portfolio.trades.forEach((trade) => {
    trade.dateStr = trade.date.toLocaleDateString('en-us', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
  });
  portfolio.trades.sort((a, b) => b.date - a.date);
  const tradeAction = req.query.edit ? 'edit' : req.query.delete ? 'delete' : null;
  if (tradeAction) {
    const trade = portfolio.trades.find((trade) => {
      return trade._id.toString() === req.query[tradeAction];
    });
    trade[tradeAction] = true;
  }
  res.render('portfolio/trades/archive', { portfolio, trades: portfolio.trades });
});

router.get("/:portfolioId/trades/new", isSignedIn, async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.portfolioId);
  res.render("portfolio/trades/new", { portfolio });
});

/* ------------------------ POST ROUTES -------------------------- */

router.post("/", async (req, res) => {
  const portfolio = await Portfolio.create({
    userId: req.session.user._id,
    name: req.body.name,
    totalValue: 0,
  });
  const user = await User.findById(req.session.user._id);
  user.portfolios.push(portfolio._id);
  await user.save();
  res.redirect("/portfolio");
});

// TODO-ST: HANDLE COMMAS from the price or quantity (no 1,535 passed)
// TODO-ST: quantity <= 0 should remove userStock from portfolio ? think*

router.post("/:portfolioId", async (req, res) => {
  const { type, symbol, date, quantity, price, notes } = req.body;
  const tradeDate = new Date(date);
  const portfolio = await Portfolio.findById(req.params.portfolioId).populate("userStocks.stock");

  let stock = await Stock.findOne({ symbol: symbol });
  console.log("did we find a stock?:", stock);
  if (!stock) stock = await utils.createStockFromAPI(symbol);

  const trades = await Trade.find({
    $and: [{ stock: stock._id }, { portfolioId: portfolio._id }],
  });
  console.log("trades found?:", trades);

  if (type.toLowerCase() === "sell" && trades.length <= 0) {
    // TODO-ST: handle user facing message
    console.log(`This is an INVALID trade. type = 'sell' but NO trades found`);
    return res.redirect(`/portfolio?id=${req.params.portfolioId}`);
  }

  const trade = await Trade.create({
    type: type.toLowerCase(),
    stock: stock._id,
    date: tradeDate,
    quantity: Number(quantity),
    price: Number(price),
    notes: notes || null,
    portfolioId: portfolio._id,
  });
  console.log("created new trade:", trade);

  if (trades.length > 0) {
    // check for BUY or SELL
    await utils.handleTradeType(portfolio, trades, trade, stock);
  } else {
    console.log('not an existing stock in the portfolio');
    const userStock = {
      stock: stock._id,
      costBasis: Number(price),
      quantity: Number(quantity),
      totalCost: Number(price) * Number(quantity),
    };
    portfolio.userStocks.push(userStock);
  }
  portfolio.trades.push(trade);
  await portfolio.save();
  await utils.updatePortfolioTotalValue(portfolio._id);
  res.redirect(`/portfolio?id=${req.params.portfolioId}`);
});

/* ------------------------- PUT ROUTES ------------------------ */

router.put("/:portfolioId", async (req, res) => {
  await Portfolio.findByIdAndUpdate(req.params.portfolioId, { name: req.body.name });
  res.redirect(`/portfolio?id=${req.params.portfolioId}`);
});

router.put("/:portfolioId/trades/:tradeId", async (req, res) => {
  console.log('req.body:', req.body);
  const date = new Date(req.body.date);
  await Trade.findByIdAndUpdate(req.params.tradeId, {
    date: date,
    notes: req.body.notes,
  });
  res.redirect(`/portfolio/${req.params.portfolioId}/trades`);
});

/* ----------------------- DELETE ROUTES ----------------------- */

router.delete("/:portfolioId", async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.portfolioId);
  const user = await User.findById(portfolio.userId);
  user.portfolios.pull(portfolio._id);
  await user.save();
  await Trade.deleteMany({ portfolioId: portfolio._id });
  await portfolio.deleteOne();
  res.redirect('/portfolio');
});

router.delete("/:portfolioId/trades/:tradeId", async (req, res) => {
  const trade = await Trade.findById(req.params.tradeId).populate('stock');
  // recalculate shares, and cost basis (update userStock)
  const tradeTotalCost = trade.price * trade.quantity;
  const portfolio = await Portfolio.findById(req.params.portfolioId);
  const userStock = portfolio.userStocks.find((u) => {
    return u.stock.toString() === trade.stock._id.toString();
  });
  // userStock needs to recalc costBasis & subtract quantity, and totalCost
  userStock.quantity = userStock.quantity - trade.quantity;
  if (userStock.quantity > 0) {
    userStock.totalCost = userStock.totalCost - tradeTotalCost;
    userStock.costBasis = userStock.totalCost / userStock.quantity;
    console.log(
      'quantity:', userStock.quantity,
      'totalCost:', userStock.totalCost,
      'costBasis:', userStock.costBasis
    );
  } else {
    portfolio.userStocks.pull(userStock._id);
  }
  portfolio.trades.pull(req.params.tradeId);
  await trade.deleteOne();
  await portfolio.save();
  await utils.updatePortfolioTotalValue(portfolio._id);
  res.redirect(`/portfolio/${req.params.portfolioId}/trades`);
});

router.delete("/:portfolioId/stocks/:stockId", async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.portfolioId).populate("userStocks.stock");
  const userStock = portfolio.userStocks.id(req.params.stockId);
  const trades = await Trade.find({
    $and: [{ stock: userStock.stock._id }, { portfolioId: portfolio._id }],
  });
  const tradesToRemove = trades.map(trade => trade._id);
  portfolio.trades.forEach(trade => {
    if (tradesToRemove.includes(trade)) portfolio.trades.pull(trade);
  });
  portfolio.userStocks.pull(userStock._id);
  await portfolio.save();
  await Trade.deleteMany({ $and: [{ stock: userStock.stock._id }, { portfolioId: portfolio._id }] });
  await utils.updatePortfolioTotalValue(portfolio._id);
  res.redirect(`/portfolio?id=${req.params.portfolioId}`);
});

module.exports = router;
