const Stock = require("../models/stock.js");

async function fetchPrices(symbols) {
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

const fetchFinancials = async (symbol) => {
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

const fetchAndCreateStock = async (symbol) => {
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

const fetchStockProfile = async (symbol) => {
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

const fetchResults = async (symbol) => {
  const response = await fetch(
    `https://financialmodelingprep.com/stable/search-symbol?query=${symbol}&apikey=${process.env.FMP_APIKEY}`
  );
  if (!response.ok) throw new Error("Failed to fetch stock search results");
  console.log('API RESONSE BEFORE JSON:', response);
  return await response.json();
};

module.exports = {
  fetchPrices,
  fetchFinancials,
  fetchStockProfile,
  fetchAndCreateStock,
  fetchResults,
};