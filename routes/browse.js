const express = require("express");
const router = express.Router();
const api = require("../utils/apiUtils.js");

/* ------------------------- GET ROUTES -------------------------- */

router.get("/", async (req, res) => {
    // topMarketMovers.gainers is an array of objects
    // with properties: symbol, price, change, and "percent_change"

    // activeStocksByVolume["most_actives"] is an array of objects
    // with properties: symbol, "trade_count", and volume
    // ordered by volume

    // activeStocksByVolume["most_actives"] is an array of objects
    // with properties: symbol, "trade_count", and volume
    // ordered by trade_count
    const { view } = req.query;
    console.log("View Query Parameter:", view);

    if (view) {
      switch (view) {
        case "active-by-volume":
          console.log("Active Stocks by Volume View Selected");
          const activeStocksByVolume = await api.fetchActiveStocksByVolume(50);
          console.log("Active Stocks by Volume:", activeStocksByVolume);
          res.render("browse/index", {
            activeByVolume: activeStocksByVolume["most_actives"],
            activeByTrades: null,
            topMarketMovers: null,
          });
          break;
        case "active-by-trades":
          console.log("Active Stocks by Trades View Selected");
          const activeStocksByTrades = await api.fetchActiveStocksByTrades(50);
          console.log("Active Stocks by Trades:", activeStocksByTrades);
          res.render("browse/index", {
            activeByVolume: null,
            activeByTrades: activeStocksByTrades["most_actives"],
            topMarketMovers: null,
          });
          break;
        case "top-market-movers":
          console.log("Top Market Movers View Selected");
          const topMarketMovers = await api.fetchTopMarketMovers(50);
          console.log("Top Market Movers:", topMarketMovers);
          res.render("browse/index", {
            activeByVolume: null,
            activeByTrades: null,
            topMarketMovers: topMarketMovers["gainers"],
          });
          break;
      }
      return;
    }
    console.log("No specific view selected, rendering default browse page.");
    res.render("browse/index", {
      activeByVolume: null,
      activeByTrades: null,
      topMarketMovers: null,
    });
});

module.exports = router;

