const express = require("express");
const router = express.Router();

/* ------------------------- GET ROUTES -------------------------- */

router.get('/', (req, res) => {
    res.render('search/index');
});

router.get('/results', (req, res) => {
  console.log('REQ.SESSION.SEARCHRESULTS:', req.session.searchResults);
  if (req.session.searchResults.length <= 0) return res.render('search/results', { results: null });
  res.render('search/results', { results: req.session.searchResults });
});

/* ------------------------- POST ROUTES ------------------------- */

// returns from search input
router.post("/", async (req, res) => {
  const results = await fetchResultsFromAPI(req.body.symbol);
  console.log('RESULTS JSON', results);
  const validResults = results.filter((result) => {
    return (result.exchange !== "OTC" && result.exchange !== "CRYPTO" && !result.symbol.includes("."));
  });
  console.log('VALID RESULTS:', validResults)
  req.session.searchResults = validResults;
  res.redirect("/search/results");
});

/* ------------------------- FUNCTIONS --------------------------- */

const fetchResultsFromAPI = async (symbol) => {
  const response = await fetch(
    `https://financialmodelingprep.com/stable/search-symbol?query=${symbol}&apikey=${process.env.FMP_APIKEY}`
  );
  if (!response.ok) throw new Error("Failed to fetch stock search results");
  console.log('API RESONSE BEFORE JSON:', response);
  return await response.json();
};

module.exports = router;