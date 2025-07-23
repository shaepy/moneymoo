const express = require("express");
const router = express.Router();
const api = require("../utils/apiUtils.js");

router.get("/", (req, res) => {
  res.render("browse/index");
});

router.get("/results", (req, res) => {
  if (req.session.searchResults.length <= 0) {
    return res.render("search/results", { results: null });
  }
  res.render("search/results", { results: req.session.searchResults });
});

router.post("/", async (req, res) => {
  req.session.searchResults = await api.fetchSearchResults(req.body.symbol);
  res.redirect("/search/results");
});

module.exports = router;
