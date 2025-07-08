const express = require("express");
const router = express.Router();
const api = require("../utils/apiUtils.js");

/* ------------------------- GET ROUTES -------------------------- */

router.get("/", (req, res) => {
  res.render("search/index");
});

router.get("/results", (req, res) => {
  if (req.session.searchResults.length <= 0) {
    return res.render("search/results", { results: null });
  }
  res.render("search/results", { results: req.session.searchResults });
});

/* ------------------------- POST ROUTES ------------------------- */

router.post("/", async (req, res) => {
  const results = await api.fetchResults(req.body.symbol);
  const validResults = results.filter((result) => {
    return (
      result.exchange !== "OTC" &&
      result.exchange !== "CRYPTO" &&
      !result.symbol.includes(".")
    );
  });
  req.session.searchResults = validResults;
  res.redirect("/search/results");
});

module.exports = router;
