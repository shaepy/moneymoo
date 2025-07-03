const Stock = require("../models/stock.js");
const Portfolio = require("../models/portfolio.js");

const createStockFromAPI = async (symbol) => {
  const response = await fetch(
    `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${process.env.FMP_APIKEY}`
  );
  if (!response.ok) throw new Error("Failed to fetch stock data");
  const stock = await response.json();
  console.log("STOCK API RESPONSE:", stock);
  return await Stock.create(stock[0]);
};

const fetchStockProfileFromAPI = async (symbol) => {
  const response = await fetch(
    `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${process.env.FMP_APIKEY}`
  );
  if (!response.ok) throw new Error("Failed to fetch stock profile data");
  const stock = await response.json();
  return stock[0];
};

const fetchFinancialsFromAPI = async(symbol) => {
    const response = await fetch(
        `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${process.env.FINNHUB_APIKEY}`
    );
    if (!response.ok) throw new Error("Failed to fetch financial data for stock");
    const financials = await response.json();
    return financials;  
};

const updatePortfolioTotalValue = async (portfolioId) => {
  const portfolio = await Portfolio.findById(portfolioId).populate("userStocks.stock");
  const totalSum = portfolio.userStocks.reduce((total, userStock) => {
    return total + (userStock.quantity * userStock.stock.price)
  }, 0);
  portfolio.totalValue = totalSum;
  await portfolio.save();
  console.log('PORTFOLIO IS SAVED/UPDATED TOTAL VALUE:', portfolio);
};

const getCurrentTotals = (trades) => {
  const currentTotalCost = trades.reduce((total, trade) => total + trade.quantity * trade.price, 0);
  console.log("CURRENT TOTAL COST:", currentTotalCost);
  const currentTotalNumOfShares = trades.reduce((total, trade) => total + trade.quantity, 0);
  console.log("CURRENT TOTAL NUM OF SHARES:", currentTotalNumOfShares);
  return { currentTotalCost, currentTotalNumOfShares };
};

const calculateNewTotals = (currentTotalCost, currentTotalNumOfShares, trade) => {
  const newTotalCost = currentTotalCost + trade.quantity * trade.price;
  console.log("NEW TOTAL COST:", newTotalCost);
  const newTotalQuantity = currentTotalNumOfShares + trade.quantity;
  console.log("NEW TOTAL QT:", newTotalQuantity);
  const newAvgCostBasis = newTotalCost / newTotalQuantity;
  console.log("NEW AVG COST BASIS:", newAvgCostBasis);
  return { newTotalCost, newTotalQuantity, newAvgCostBasis };
};

const handleTradeType = async (portfolio, trades, trade, stock) => {
  const userStock = portfolio.userStocks.find((userSt) => {
    return userSt.stock._id.toString() === stock._id.toString();
  });
  if (trade.type.toLowerCase() === "buy") {
    console.log("--------- THIS IS A BUY TRADE ---------");
    const { currentTotalCost, currentTotalNumOfShares } = getCurrentTotals(trades);
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

module.exports = {
    createStockFromAPI,
    updatePortfolioTotalValue,
    getCurrentTotals,
    calculateNewTotals,
    handleTradeType,
    fetchStockProfileFromAPI,
    fetchFinancialsFromAPI,
};