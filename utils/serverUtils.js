const Stock = require("../models/stock.js");
const Portfolio = require("../models/portfolio.js");

const createStockFromAPI = async (symbol) => {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${process.env.FMP_APIKEY}`
    );
    const stock = await response.json();
    return await Stock.create(stock[0]);
  } catch (err) {
    console.error("Failed to fetch stock data", err);
  }
};

const fetchStockProfileFromAPI = async (symbol) => {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${process.env.FMP_APIKEY}`
    );
    const stock = await response.json();
    return stock[0];
  } catch (err) {
    console.error("Failed to fetch stock profile data", err);
  }
};

const fetchFinancialsFromAPI = async (symbol) => {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${process.env.FINNHUB_APIKEY}`
    );
    const financials = await response.json();
    return financials;
  } catch (err) {
    console.error("Failed to fetch financial data for stock", err);
  }
};

const updatePortfolioTotalValue = async (portfolioId) => {
  const portfolio = await Portfolio.findById(portfolioId).populate("userStocks.stock");
  const totalSum = portfolio.userStocks.reduce((total, userStock) => {
    return total + userStock.quantity * userStock.stock.price;
  }, 0);
  portfolio.totalValue = totalSum;
  await portfolio.save();
};

const getCurrentTotals = (trades) => {
  const currentTotalCost = trades.reduce((total, trade) => total + trade.quantity * trade.price, 0);
  const currentTotalNumOfShares = trades.reduce((total, trade) => total + trade.quantity, 0);
  return { currentTotalCost, currentTotalNumOfShares };
};

const calculateNewTotals = (currentTotalCost, currentTotalNumOfShares, trade) => {
  const newTotalCost = currentTotalCost + trade.quantity * trade.price;
  const newTotalQuantity = currentTotalNumOfShares + trade.quantity;
  const newAvgCostBasis = newTotalCost / newTotalQuantity;
  return { newTotalCost, newTotalQuantity, newAvgCostBasis };
};

const calculateMktValueAndPL = async (userStocksArray) => {
  userStocksArray.forEach((userStock) => {
    userStock.marketValue = (
      userStock.stock.price * userStock.quantity
    ).toFixed(2);
    userStock.unrealizedPL = (
      userStock.stock.price * userStock.quantity -
      userStock.totalCost
    ).toFixed(2);
    userStock.unrealizedPLPercent = (
      ((userStock.stock.price * userStock.quantity - userStock.totalCost) / userStock.totalCost) * 100
    ).toFixed(2);
  });
};

const getPortfoliosSumValue = async (portfolios) => {
  let portfoliosSumValue = portfolios.reduce((total, portfolio) => {
    return total + portfolio.totalValue;
  }, 0);
  portfoliosSumValue = Number(portfoliosSumValue.toFixed(2)).toLocaleString();
  return portfoliosSumValue;
};

const handleTradeType = async (portfolio, trades, trade, stock) => {
  const userStock = portfolio.userStocks.find((userSt) => {
    return userSt.stock._id.toString() === stock._id.toString();
  });
  if (trade.type.toLowerCase() === "buy") {
    console.log("--------- THIS IS A BUY TRADE ---------");
    const { currentTotalCost, currentTotalNumOfShares } =
      getCurrentTotals(trades);
    const { newAvgCostBasis, newTotalQuantity, newTotalCost } =
      calculateNewTotals(currentTotalCost, currentTotalNumOfShares, trade);
    userStock.set({
      costBasis: newAvgCostBasis,
      quantity: newTotalQuantity,
      totalCost: newTotalCost,
    });
  } else {
    console.log("--------- THIS IS A SELL TRADE ---------");
    userStock.set({
      quantity: userStock.quantity - trade.quantity,
      totalCost: userStock.totalCost - userStock.costBasis * trade.quantity,
    });
  }
};

const calcPortfoliosSum = async (userStocksArray) => {
  const qtSum = userStocksArray.reduce((total, userStock) => total + userStock.quantity, 0);
  const mktValueSum = userStocksArray.reduce((total, userStock) => {
    return total + Number(userStock.marketValue);
  }, 0);
  const costBasisSum = userStocksArray.reduce((total, userStock) => total + userStock.totalCost, 0);
  const unrealizedPL = mktValueSum - costBasisSum;
  const unrealizedPLPercent = ((mktValueSum - costBasisSum) / costBasisSum) * 100;
  console.log(
    "qtSum:", qtSum,
    "mktValueSum:", mktValueSum,
    "costBasisSum:", costBasisSum,
    "unrealizedPL:", unrealizedPL,
    "unrealizedPLPercent:", unrealizedPLPercent
  );
  return {
    qtSum: qtSum,
    mktValueSum: Number(mktValueSum.toFixed(2)).toLocaleString(),
    costBasisSum: Number(costBasisSum.toFixed(2)).toLocaleString(),
    unrealizedPL: Number(unrealizedPL.toFixed(2)).toLocaleString(),
    unrealizedPLPercent: Number(unrealizedPLPercent.toFixed(2)).toLocaleString(),
  };
};

async function updateStockPrices(bulkOps) {
  try {
    const result = await Stock.bulkWrite(bulkOps);
    console.log(`${result.modifiedCount} stocks were updated.`);
  } catch (error) {
    console.error("Error updating stock prices:", error);
  }
};

async function fetchPricesFromAPI(symbols) {
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "APCA-API-KEY-ID": `${process.env.APCA_API_KEY_ID}`,
      "APCA-API-SECRET-KEY": `${process.env.APCA_API_SECRET_KEY}`,
    },
  };
  try {
    const response = await fetch(
      `https://data.alpaca.markets/v2/stocks/bars/latest?symbols=${symbols}`, 
      options
    );
    return await response.json();
  } catch (err) {
    console.error("Error with fetching stock prices:", err);
  }
};

module.exports = {
  createStockFromAPI,
  updatePortfolioTotalValue,
  getCurrentTotals,
  calculateNewTotals,
  handleTradeType,
  fetchStockProfileFromAPI,
  fetchFinancialsFromAPI,
  calculateMktValueAndPL,
  calcPortfoliosSum,
  updateStockPrices,
  fetchPricesFromAPI,
  getPortfoliosSumValue,
};
