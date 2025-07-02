const express = require("express");
const router = express.Router();

/* ------------------------- GET ROUTES -------------------------- */

router.get('/', (req, res) => {
    res.send('stock index');
});

router.get('/:stockSymbol', async (req, res) => {
    // grab data from API to create the show pages
    const profile = await fetchStockProfileFromAPI(req.params.stockSymbol);
    console.log("API RESPONSE FOR STOCK PROFILE:", profile);

    // MUTUAL FUNDS ARE NOT SUPPORTED FOR FINANCIALS
    const financials = await fetchFinancialsFromAPI(req.params.stockSymbol);
    console.log("API RESPONSE FOR BASIC FINANCIALS:", financials);

    if (!financials) return res.render(`stock/show`, { stock: profile, financials: null });

    res.render(`stock/show`, {
        stock: profile,
        financials: financials.metric,
    });
});

/* ------------------------- POST ROUTES -------------------------- */

/* ------------------------- PUT ROUTES -------------------------- */

/* ------------------------ DELETE ROUTES ------------------------ */

/* ------------------------- FUNCTIONS --------------------------- */

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

module.exports = router;