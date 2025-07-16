const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const morgan = require("morgan");
const session = require('express-session');
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const cron = require("node-cron");
const path = require("path");

// * Routes and Controllers
const portfolioRoutes = require("./routes/portfolio.js");
const watchlistRoutes = require("./routes/watchlist.js");
const searchRoutes = require("./routes/search.js");
const browseRoutes = require("./routes/browse.js");
const stockRoutes = require("./routes/stock.js");
const authController = require("./controllers/auth.js");

// * Middleware + Utils
const api = require("./utils/apiUtils.js");
const queries = require("./queries/queries.js");
const userToView = require("./middleware/user-to-view.js");
const isSignedIn = require("./middleware/is-signed-in.js");

// * App
const app = express();
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

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

app.use(userToView);
app.use('/auth', authController);

app.get('/', async (req, res) => {
  if (req.session.user) {
    const portfolios = await queries.getUserPortfolios(req.session.user._id);
    const watchlists = await queries.getUserWatchlists(req.session.user._id);
    // const portfoliosSumValue = await utils.getPortfoliosSumValue(portfolios);
    res.render("index", {
      portfolios: portfolios,
      watchlists: watchlists,
      // portfoliosSumValue,
    });
  } else {
    res.render("index", {
      portfolios: null,
      watchlists: null,
    });
  }
});

app.use('/search', searchRoutes);
app.use('/browse', browseRoutes);
app.use('/stock', stockRoutes);
app.use(isSignedIn);
app.use('/portfolio', portfolioRoutes);
app.use('/watchlist', watchlistRoutes);

app.listen(process.env.PORT, () => {
  console.log(`App is listening on port ${process.env.PORT}`);
});

/* --------- CRON JOB / STOCK PRICES --------- */

cron.schedule("*/15 * * * *", async () => {
  console.log("CRON UPDATING STOCK PRICES. SET TO EVERY 15 MIN");
  const stocks = await queries.getDatabaseStocks();
  const stockSymbols = stocks.map(stock => stock.symbol).join("%2C");
  const data = await api.fetchPrices(stockSymbols);
  const newPrices = [];
  Object.keys(data.bars).forEach((key) => {
    const newObj = { symbol: key, price: data.bars[key].c };
    newPrices.push(newObj);
  });
  console.log("NEW PRICES:", newPrices);
  const bulkEdit = newPrices.map((stock) => {
    return {
      updateOne: {
        filter: { symbol: stock.symbol },
        update: { $set: { price: stock.price } },
      },
    };
  });
  console.log("BULK EDIT:", bulkEdit);
  await queries.updateStockPrices(bulkEdit);
});
