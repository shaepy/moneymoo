const express = require("express");
const Portfolio = require("../models/portfolio.js");
const User = require("../models/user.js");
const Trade = require("../models/trade.js");
const Stock = require("../models/stock.js");
const router = express.Router();
const isSignedIn = require("../middleware/is-signed-in.js");

/* ------------------------- GET ROUTES ------------------------- */

router.get("/", isSignedIn, async (req, res) => {
  const portfolioId = req.query.id;
  const user = await User.findById(req.session.user._id).populate("portfolios");

  if (portfolioId) {
    const portfolio = await Portfolio.findById(portfolioId).populate("userStocks.stock");

    portfolio.userStocks.forEach((userStock) => {
      userStock.currentValue = (
        userStock.stock.price * userStock.quantity
      ).toFixed(2);
      userStock.unrealizedPL = (
        userStock.stock.price * userStock.quantity - userStock.totalCost
      ).toFixed(2);
      userStock.unrealizedPLPercent = (
        ((userStock.stock.price * userStock.quantity - userStock.totalCost) / userStock.totalCost) * 100
      ).toFixed(2);
    });

    if (req.query.edit) portfolio.edit = true;

    return res.render("portfolio/index", {
      portfolios: null,
      activePortfolio: portfolio,
    });
  }

  if (user.portfolios.length > 0) {
    const portfoliosSumValue = user.portfolios.reduce((total, portfolio) => {
      return total + portfolio.totalValue;
    }, 0);

    res.render("portfolio/index", {
      portfolios: user.portfolios,
      activePortfolio: null,
      portfoliosSumValue,
    });
  } else {
    res.render("portfolio/index", {
      portfolios: null,
      activePortfolio: null,
    });
  }
});

router.get("/new", isSignedIn, (req, res) => {
  res.render("portfolio/new");
});

router.get("/:portfolioId/edit", isSignedIn, async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.portfolioId);
  res.render("portfolio/edit", { portfolio });
});

router.get("/:portfolioId/remove", isSignedIn, async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.portfolioId);
  res.render("portfolio/remove", { portfolio });
});

router.get("/:portfolioId/trades", isSignedIn, async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.portfolioId)
  .populate({
    path: 'trades',
    populate: {
        path: 'stock',
        model: 'Stock',
    }
  });
  portfolio.trades.forEach((trade) => {
    trade.dateStr = trade.date.toLocaleDateString('en-us', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
  });
  portfolio.trades.sort((a, b) => b.date - a.date);

  if (req.query) {
    if (req.query.edit) {
      const tradeId = req.query.edit;
      const trade = portfolio.trades.find(trade => trade._id.toString() === tradeId);
      trade.edit = true;
    } else {
      // TODO-ST: it's delete
      const tradeId = req.query.delete;
    }
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
  if (!stock) stock = await createStockFromAPI(symbol);

  const trades = await Trade.find({
    $and: [{ stock: stock._id }, { portfolioId: portfolio._id }],
  });
  console.log("trades found?:", trades);

  if (type.toLowerCase() === "sell" && trades.length <= 0) {
    // TODO-ST: handle user facing message
    console.log(`This is an INVALID trade. type==='sell' but NO trades found`);
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
    await handleTradeType(portfolio, trades, trade, stock);
  } else {
    console.log('this is not an existing stock in the portfolio');
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
  await updateportfoliosSumValue(portfolio._id);
  res.redirect(`/portfolio?id=${req.params.portfolioId}`);
});

/* ------------------------- PUT ROUTES ------------------------ */

router.put("/:portfolioId", async (req, res) => {
  await Portfolio.findByIdAndUpdate(req.params.portfolioId, { name: req.body.name });
  res.redirect(`/portfolio?id=${req.params.portfolioId}`)
});

router.put("/:portfolioId/trades/:tradeId", async (req, res) => {
  console.log(req.body);
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

/* ------------------------- FUNCTIONS ------------------------- */

const createStockFromAPI = async (symbol) => {
  let stock = await fetch(
    `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${process.env.FMP_APIKEY}`
  );
  if (!stock.ok) throw new Error("Failed to fetch stock data");
  stock = await stock.json();
  console.log("API response stock.json:", stock);
  return await Stock.create(stock[0]);
};

const updateportfoliosSumValue = async (portfolioId) => {
  const portfolio = await Portfolio.findById(portfolioId).populate("userStocks.stock");
  const totalSum = portfolio.userStocks.reduce((total, userStock) => {
    return total + (userStock.quantity * userStock.stock.price)
  }, 0);
  portfolio.totalValue = totalSum;
  await portfolio.save();
  console.log('portfolio is saved/updated now:', portfolio);
};

const getCurrentTotals = (trades) => {
  const currentTotalCost = trades.reduce((total, trade) => total + trade.quantity * trade.price, 0);
  console.log("currentTotalCost:", currentTotalCost);
  const currentTotalNumOfShares = trades.reduce((total, trade) => total + trade.quantity, 0);
  console.log("currentTotalNumOfShares:", currentTotalNumOfShares);

  return { currentTotalCost, currentTotalNumOfShares };
};

const calculateNewTotals = (currentTotalCost, currentTotalNumOfShares, trade) => {
  const newTotalCost = currentTotalCost + trade.quantity * trade.price;
  console.log("newTotalCost:", newTotalCost);
  const newTotalQuantity = currentTotalNumOfShares + trade.quantity;
  console.log("newTotalQuantity:", newTotalQuantity);
  const newAvgCostBasis = newTotalCost / newTotalQuantity;
  console.log("newAvgCostBasis:", newAvgCostBasis);

  return { newTotalCost, newTotalQuantity, newAvgCostBasis };
};

const handleTradeType = async (portfolio, trades, trade, stock) => {
  const userStock = portfolio.userStocks.find((userSt) => {
    return userSt.stock._id.toString() === stock._id.toString();
  });

  if (trade.type.toLowerCase() === "buy") {
    console.log("this is a BUY trade");
    const { currentTotalCost, currentTotalNumOfShares } = getCurrentTotals(trades);
    const { newAvgCostBasis, newTotalQuantity, newTotalCost } =
      calculateNewTotals(currentTotalCost, currentTotalNumOfShares, trade);

    userStock.set({
      costBasis: newAvgCostBasis,
      quantity: newTotalQuantity,
      totalCost: newTotalCost,
    });
  } else {
    console.log("this is a SELL trade");
    userStock.set({
      quantity: userStock.quantity - trade.quantity,
      totalCost: userStock.totalCost - userStock.costBasis * trade.quantity,
    });

    // TODO-ST: check for quantity if 0, remove stock from portfolio.userStock, keep trades
  }
};

module.exports = router;
