const express = require("express");
const isSignedIn = require("../middleware/is-signed-in.js");
const router = express.Router();
const utils = require("../utils/serverUtils.js");
const queries = require("../controllers/queries/queries.js");

/* ------------------------- GET ROUTES ------------------------- */

router.get("/", isSignedIn, async (req, res) => {
  const portfolioId = req.query.id;
  const portfolios = await queries.getUserPortfolios(req.session.user._id);

  if (portfolioId) {
    const portfolio = await queries.getPortfolioById(portfolioId);
    await utils.calculateMktValueAndPL(portfolio.userStocks);
    const portfolioSummary = await utils.calcPortfoliosSummary(portfolio.userStocks);
    if (req.query.edit) portfolio.edit = true;
    return res.render("portfolio/index", {
      portfolios: portfolios,
      activePortfolio: portfolio,
      userStocks: null,
      summary: portfolioSummary,
    });
  }
  const stockLists = portfolios
    .filter((list) => list.userStocks.length > 0)
    .map((list) => list.userStocks)
    .flat();

  // * if no stocks or no portfolios are found, it will return here
  if (stockLists.length < 1 || portfolios.length < 1) {
    console.log('NO STOCKS FOUND OR NO PORTFOLIOS FOUND');
    return res.render('portfolio/index', {
      portfolios: portfolios,
      activePortfolio: null,
      userStocks: null,
      portfoliosSumValue: null,
      summary: null,
    });
  }
  const userStocks = [...new Set(stockLists)];
  await utils.calculateMktValueAndPL(userStocks);
  const portfoliosSummary = await utils.calcPortfoliosSummary(userStocks);
  const portfoliosSumValue = await utils.getPortfoliosSumValue(portfolios);

  res.render("portfolio/index", {
    portfolios: portfolios,
    activePortfolio: null,
    portfoliosSumValue,
    userStocks: userStocks,
    summary: portfoliosSummary,
  });
});

router.get("/new", isSignedIn, (req, res) => {
  res.render("portfolio/new");
});

router.get("/:portfolioId/remove", isSignedIn, async (req, res) => {
  const stockId = req.query.id;
  const portfolio = await queries.getPortfolioById(req.params.portfolioId);
  if (stockId) {
    const userStock = portfolio.userStocks.id(stockId);
    res.render("portfolio/remove", {
      removePortfolio: false,
      userStock: userStock,
      portfolio,
    });
  } else {
    res.render("portfolio/remove", {
      removePortfolio: true,
      userStock: null,
      portfolio,
    });
  }
});

router.get("/:portfolioId/trades", isSignedIn, async (req, res) => {
  const portfolio = await queries.getPortfolioAndTrades(req.params.portfolioId);
  const tradeAction = req.query.edit ? 'edit' : req.query.delete ? 'delete' : null;
  if (tradeAction) {
    const trade = portfolio.trades.find((trade) => {
      return trade._id.toString() === req.query[tradeAction];
    });
    trade[tradeAction] = true;
  }
  res.render('portfolio/trades/archive', { portfolio, trades: portfolio.trades });
});

router.get("/:portfolioId/trades/new", isSignedIn, async (req, res) => {
  const portfolio = await queries.getPortfolioById(req.params.portfolioId);
  res.render("portfolio/trades/new", { portfolio });
});

/* ------------------------ POST ROUTES -------------------------- */

router.post("/", async (req, res) => {
  await queries.createPortfolio(req.session.user._id, req.body.name);
  res.redirect("/portfolio");
});

// TODO-ST: HANDLE COMMAS from the price or quantity (no 1,535 passed)
// TODO-ST: quantity <= 0 should remove userStock from portfolio ? think *
// TODO-ST: handle user facing message for invalid trades of SELL & no existing stock

// create a new trade
router.post("/:portfolioId", async (req, res) => {
  const portfolioId = req.params.portfolioId;
  const { type, symbol, date, quantity, price, notes } = req.body;
  await queries.createTrade(type, symbol, date, quantity, price, notes, portfolioId);
  res.redirect(`/portfolio?id=${portfolioId}`);
});

/* ------------------------- PUT ROUTES ------------------------ */

router.put("/:portfolioId", async (req, res) => {
  await queries.updatePortfolio(req.params.portfolioId, req.body.name);
  res.redirect(`/portfolio?id=${req.params.portfolioId}`);
});

router.put("/:portfolioId/trades/:tradeId", async (req, res) => {
  await queries.updateTrade(req.params.tradeId, req.body.date, req.body.notes);
  res.redirect(`/portfolio/${req.params.portfolioId}/trades`);
});

/* ----------------------- DELETE ROUTES ----------------------- */

router.delete("/:portfolioId", async (req, res) => {
  await queries.deletePortfolio(req.params.portfolioId);
  res.redirect('/portfolio');
});

// Delete a trade
router.delete("/:portfolioId/trades/:tradeId", async (req, res) => {
  await queries.deleteFromPortfolio(req.params.portfolioId, req.params.tradeId);
  res.redirect(`/portfolio/${req.params.portfolioId}/trades`);
});

router.delete("/:portfolioId/stocks/:stockId", async (req, res) => {
  const portfolioId = req.params.portfolioId;
  await queries.deleteTradesByPortfolio(req.params.stockId, portfolioId);
  await queries.updatePortfolioTotalValue(portfolioId);
  res.redirect(`/portfolio?id=${portfolioId}`);
});

module.exports = router;
