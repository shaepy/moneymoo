const Portfolio = require("../models/portfolio.js");
const Watchlist = require("../models/watchlist.js");
const User = require("../models/user.js");
const Trade = require("../models/trade.js");
const Stock = require("../models/stock.js");
const api = require("../utils/apiUtils.js");
const utils = require("../utils/serverUtils.js");

const getUserPortfolios = async (userId) => {
  const userPortfolios = await Portfolio.find({ userId: userId }).populate("userStocks.stock");
  console.log("USER PORTFOLIOS FROM DATABASE:", userPortfolios);
  return userPortfolios;
};

const getPortfolioById = async (portfolioId) => {
  const portfolio = await Portfolio.findById(portfolioId).populate("userStocks.stock");
  console.log("PORTFOLIO FOUND:", portfolio);
  return portfolio;
};

const createPortfolio = async (userId, name) => {
  const portfolio = await Portfolio.create({
    userId: userId,
    name: name,
    totalValue: 0,
  });
  const user = await getUserById(userId);
  user.portfolios.push(portfolio._id);
  await user.save();
};

const createTrade = async (type, symbol, date, quantity, price, notes, portfolioId) => {
  const portfolio = await getPortfolioById(portfolioId);
  const stock = await findOrCreateStock(symbol);
  const trades = await getTradesByPortfolioStock(stock._id, portfolio._id);
  const tradeDate = new Date(date);

  if (type.toLowerCase() === "sell" && trades.length <= 0) {
    console.log(`This is an INVALID trade. TYPE = 'sell' but NO trades found.`);
    return;
  }
  const trade = await Trade.create({
    type: type.toLowerCase(),
    stock: stock._id,
    date: tradeDate,
    quantity: Number(quantity),
    price: Number(price),
    notes: notes || null,
    portfolioId: portfolioId,
  });
  console.log("NEW TRADE CREATED:", trade);

  if (trades.length > 0) {
    await utils.handleTradeType(portfolio, trades, trade, stock);
  } else {
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
  await updatePortfolioTotalValue(portfolioId);
};

const createWatchlist = async (userId, name) => {
  const watchlist = await Watchlist.create({ userId, name });
  const user = await getUserById(userId);
  user.watchlists.push(watchlist);
  await user.save();
  return watchlist;
};

const addToWatchlist = async (formData, stockId, userId) => {
  Object.keys(formData).forEach((wl) => {
    if (formData[wl] === "on") formData[wl] = true;
  });
  const stock = await getStockById(stockId);
  const watchlists = await getUserWatchlists(userId);
  watchlists.forEach((watchlist) => {
    Object.keys(formData).forEach(async (key) => {
      if (key === watchlist.name && key) {
        const foundList = await Watchlist.findOne({ name: watchlist.name });
        console.log("FOUND A LIST AND PUSHING STOCK:", foundList);
        foundList.stocks.push(stock);
        await foundList.save();
      }
    });
  });
};

const updateWatchlist = async (watchlistId, name) => {
  await Watchlist.findByIdAndUpdate(watchlistId, { name: name });
};

const updatePortfolio = async (portfolioId, name) => {
  await Portfolio.findByIdAndUpdate(portfolioId, { name: name });
};

const updatePortfolioTotalValue = async (portfolioId) => {
  const portfolio = await getPortfolioById(portfolioId);
  const totalSum = portfolio.userStocks.reduce((total, userStock) => {
    return total + userStock.quantity * userStock.stock.price;
  }, 0);
  portfolio.totalValue = totalSum;
  await portfolio.save();
};

const updateTrade = async (tradeId, date, notes) => {
  const newDate = new Date(date);
  await Trade.findByIdAndUpdate(tradeId, {
    date: newDate,
    notes: notes,
  });
};

const removeFromWatchlist = async (watchlistId, stockId) => {
  const watchlist = await getWatchlistById(watchlistId);
  watchlist.stocks.pull(stockId);
  await watchlist.save();
};

const getUserWatchlists = async (userId) => {
  const userWatchlists = await Watchlist.find({ userId: userId }).populate("stocks");
  console.log("USER WATCHLISTS FROM DATABASE:", userWatchlists);
  return userWatchlists;
};

const getWatchlistById = async (watchlistId) => {
  const watchlist = await Watchlist.findById(watchlistId).populate("stocks");
  console.log("WATCHLIST BY ID FOUND:", watchlist);
  return watchlist;
};

const deleteTradeFromPortfolio = async (portfolioId, tradeId) => {
  const trade = await getTradeById(tradeId);
  const tradeTotalCost = trade.price * trade.quantity;
  const portfolio = await getPortfolioById(portfolioId);
  const userStock = portfolio.userStocks.find((u) => {
    return u.stock._id.toString() === trade.stock._id.toString();
  });

  if (trade.type.toLowerCase() === "buy") {
    userStock.quantity = userStock.quantity - trade.quantity;
    if (userStock.quantity > 0) {
      userStock.totalCost = userStock.totalCost - tradeTotalCost;
      userStock.costBasis = userStock.totalCost / userStock.quantity;
    } else {
      portfolio.userStocks.pull(userStock._id);
    }
  } else {
    userStock.quantity = userStock.quantity + trade.quantity;
    userStock.totalCost = userStock.totalCost + tradeTotalCost;
    userStock.costBasis = userStock.totalCost / userStock.quantity;
  }
  portfolio.trades.pull(tradeId);
  await trade.deleteOne();
  await portfolio.save();
  await updatePortfolioTotalValue(portfolio._id);
};

const deletePortfolio = async (portfolioId) => {
  const portfolio = await getPortfolioById(portfolioId);
  const user = await getUserById(portfolio.userId);
  user.portfolios.pull(portfolio._id);
  await user.save();
  await Trade.deleteMany({ portfolioId: portfolio._id });
  await portfolio.deleteOne();
};

const deleteWatchlist = async (watchlistId) => {
  const watchlist = await getWatchlistById(watchlistId);
  const user = await getUserById(watchlist.userId);
  user.watchlists.pull(watchlist._id);
  await user.save();
  await watchlist.deleteOne();
};

const getUserById = async (userId) => {
  const user = await User.findById(userId);
  console.log("FOUND USER BY ID:", user);
  return user;
};

const getTradesByPortfolioStock = async (stockId, portfolioId) => {
  const trades = await Trade.find({
    $and: [{ stock: stockId }, { portfolioId: portfolioId }],
  });
  console.log("TRADES FOUND?:", trades);
  return trades;
};

async function updateStockPrices(bulkEdit) {
  try {
    const result = await Stock.bulkWrite(bulkEdit);
    console.log(`${result.modifiedCount} stocks were updated.`);
  } catch (error) {
    console.error("Error updating stock prices:", error);
  }
}

async function getDatabaseStocks() {
  return await Stock.find();
}

const findOrCreateStock = async (symbol) => {
  let stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  console.log("DID WE FIND A STOCK?:", stock);
  if (!stock) stock = await api.fetchAndCreateStock(symbol);
  return stock;
};

const getStockById = async (stockId) => {
  const stock = await Stock.findById(stockId);
  console.log("FOUND STOCK BY ID:", stock);
  return stock;
};

const getTradeById = async (tradeId) => {
  const trade = await Trade.findById(tradeId).populate("stock");
  console.log("TRADE FOUND BY ID:", trade);
  return trade;
};

const deleteStockFromPortfolio = async (stockId, portfolioId) => {
  const portfolio = await getPortfolioById(portfolioId);
  const userStock = portfolio.userStocks.id(stockId);
  const trades = await getTradesByPortfolioStock(userStock.stock._id, portfolio._id);

  const tradesToRemove = trades.map((trade) => trade._id.toString());
  console.log("TRADES TO REMOVE:", tradesToRemove, typeof tradesToRemove[0]);
  portfolio.trades.forEach((trade) => {
    console.log("TRADE IS:", trade, typeof trade);
    if (tradesToRemove.includes(trade.toString())) {
      portfolio.trades.pull(trade);
      console.log("PORTFOLIO TRADES:", portfolio.trades);
    }
  });

  portfolio.userStocks.pull(userStock._id);
  await portfolio.save();
  await Trade.deleteMany({
    $and: [{ stock: userStock.stock._id }, { portfolioId: portfolio._id }],
  });
};

const getPortfolioAndTrades = async (portfolioId) => {
  const portfolio = await Portfolio.findById(portfolioId).populate({
    path: "trades",
    populate: { path: "stock", model: "Stock" },
  });
  portfolio.trades.forEach((trade) => {
    trade.dateStr = trade.date.toLocaleDateString("en-us", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  });
  portfolio.trades.sort((a, b) => b.date - a.date);
  return portfolio;
};

module.exports = {
  // getters
  getTradeById,
  getStockById,
  getUserPortfolios,
  getUserWatchlists,
  getPortfolioById,
  getWatchlistById,
  getUserById,
  getPortfolioAndTrades,
  getDatabaseStocks,
  findOrCreateStock,
  // setters
  createPortfolio,
  createTrade,
  createWatchlist,
  // updates
  addToWatchlist,
  updateStockPrices,
  updatePortfolio,
  updatePortfolioTotalValue,
  updateTrade,
  updateWatchlist,
  // deletes
  removeFromWatchlist,
  deleteStockFromPortfolio,
  deleteTradeFromPortfolio,
  deletePortfolio,
  deleteWatchlist,
};
