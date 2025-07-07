const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const morgan = require("morgan");
const session = require('express-session');
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const cron = require("node-cron");
const path = require("path");

// * Models
const portfolioRoutes = require("./routes/portfolio.js");
const watchlistRoutes = require("./routes/watchlist.js");
const searchRoutes = require("./routes/search.js");
const stockRoutes = require("./routes/stock.js");
const authController = require("./controllers/auth.js")
const Stock = require("./models/stock.js");

// * Middleware
const utils = require("./utils/serverUtils.js");
const queries = require("./controllers/queries/queries.js");
const userToView = require("./middleware/user-to-view.js");

// * App
const app = express();
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));

/* --------- MONGODB CONNECTION --------- */

mongoose.connect(process.env.MONGODB_URI);

try {
  mongoose.connection.on("connected", () => {
    console.log(
      `Connected to MongoDB collection: ${mongoose.connection.name}.`
    );
  });
} catch (error) {
  console.log(
    `Failed to connect to MongoDB collection: ${mongoose.connection.name}`
  );
}

/* --------- ROUTES --------- */

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(userToView);

app.use('/auth', authController);

app.get('/', async (req, res) => {
  // get user portfolios and watchlists
  if (req.session.user) {

    const portfolios = await queries.getUserPortfolios(req.session.user._id);
    console.log('PORTFOLIOS:', portfolios);
    const watchlists = await queries.getUserWatchlists(req.session.user._id);
    console.log('WATCHLISTS:', watchlists);

    const portfoliosSumValue = await utils.getPortfoliosSumValue(portfolios);
    console.log('PORTFOLIOS SUM VALUE:', portfoliosSumValue);

    res.render("index", {
      portfolios: portfolios,
      watchlists: watchlists,
      portfoliosSumValue,
    });

  } else {
    res.render("index", {
      portfolios: null,
      watchlists: null,
    });
  }

});

app.use('/portfolio', portfolioRoutes);
app.use('/watchlist', watchlistRoutes);
app.use('/search', searchRoutes);
app.use('/stock', stockRoutes);

app.listen(process.env.PORT, () => {
  console.log(`App is listening on port ${process.env.PORT}`);
});

/* --------- FETCH STOCK PRICES --------- */
// # Alpaca limits MAX of 200 calls/min

cron.schedule("*/45 * * * *", async () => {
  console.log("RUNNING A CRON JOB TO UPDATE STOCK PRICES. SET TO EVERY 45 MIN");
  const stocks = await Stock.find();
  console.log("STOCKS:", stocks);
  const stockSymbols = stocks.map(stock => stock.symbol).join("%2C");
  const data = await utils.fetchPricesFromAPI(stockSymbols);
  console.log("DATA IS:", data);

  const newPrices = [];
  Object.keys(data.bars).forEach((key) => {
    const newObj = { symbol: key, price: data.bars[key].c };
    newPrices.push(newObj);
  });
  console.log("NEW PRICES:", newPrices);

  const bulkOps = newPrices.map((stock) => {
    return {
      updateOne: {
        filter: { symbol: stock.symbol },
        update: { $set: { price: stock.price } },
      },
    };
  });
  console.log("BULK OPS:", bulkOps);

  await utils.updateStockPrices(bulkOps);
});
