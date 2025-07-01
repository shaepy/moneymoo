const express = require("express");
const router = express.Router();

/* ------------------------- GET ROUTES -------------------------- */

router.get('/', (req, res) => {
    res.render('search/index');
});

router.get('/results', (req, res) => {
    console.log('REQ.SESSION.SEARCHRESULTS:', req.session.searchResults);
    res.render('search/results', { results: req.session.searchResults })
});

/* ------------------------- POST ROUTES ------------------------- */

// returns from search input
router.post("/", async (req, res) => {
  // user gives us a symbol
  const { symbol } = req.body;
  console.log("SYMBOL:", symbol);

  // we stick this in FMP API to get the results
  const results = await fetchResultsFromAPI(symbol);
  const validResults = results.filter((result) => {
    return (result.exchange !== "OTC" && result.exchange !== "CRYPTO" && !result.symbol.includes("."));
  });
  console.log("VALID RESULTS FILTERED:", validResults);

  // save results to req.session.searchResults
  req.session.searchResults = validResults;

  res.redirect("/search/results");
});

/* ------------------------- PUT ROUTES -------------------------- */

/* ------------------------ DELETE ROUTES ------------------------ */

/* ------------------------- FUNCTIONS --------------------------- */

const fetchResultsFromAPI = async (symbol) => {
  const response = await fetch(
    `https://financialmodelingprep.com/stable/search-symbol?query=${symbol}&apikey=${process.env.FMP_APIKEY}`
  );
  if (!response.ok) throw new Error("Failed to fetch stock search results");
  return await response.json();
};

module.exports = router;