const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const morgan = require("morgan");
const session = require("express-session");
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
    console.log(`Connected to MongoDB collection: ${mongoose.connection.name}.`);
  });
} catch (error) {
  console.log(`Failed to connect to MongoDB collection: ${mongoose.connection.name}`);
}

/* --------- ROUTES --------- */

app.use(userToView);
app.use("/auth", authController);

app.get("/", async (req, res) => {
  if (req.session.user) {
    const portfolios = await queries.getUserPortfolios(req.session.user._id);
    const watchlists = await queries.getUserWatchlists(req.session.user._id);
    res.render("index", {
      portfolios: portfolios,
      watchlists: watchlists,
    });
  } else {
    res.render("index", {
      portfolios: null,
      watchlists: null,
    });
  }
});

app.use("/search", searchRoutes);
app.use("/browse", browseRoutes);
app.use("/stock", stockRoutes);
app.use(isSignedIn);
app.use("/portfolio", portfolioRoutes);
app.use("/watchlist", watchlistRoutes);

app.listen(process.env.PORT, () => {
  console.log(`App is listening on port ${process.env.PORT}`);
});

/* --------- CRON JOBS --------- */

cron.schedule("*/15 * * * *", async () => {
  console.log("CRON UPDATING STOCK PRICES. SET TO EVERY 15 MIN");
  const stocks = await queries.getDatabaseStocks();
  const stockSymbols = stocks.map((stock) => stock.symbol).join("%2C");
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
  await queries.updateStockPrices(bulkEdit);
});

cron.schedule("* 6 * * *", async () => {
  console.log("CRON UPDATING PORTFOLIO TOTAL VALUES. SET TO EVERY 6 HRS");
  const portfoliosInDatabase = await queries.getDatabasePortfolios();
  portfoliosInDatabase.forEach((portfolio) => {
    const mktValue = portfolio.userStocks.reduce((total, userStock) => {
      return total + userStock.quantity * userStock.stock.price;
    }, 0);
    portfolio.mktValue = mktValue;
    console.log("portfolio.mktValue:", portfolio.mktValue);
  });
  const bulkEdit = portfoliosInDatabase.map((portfolio) => {
    return {
      updateOne: {
        filter: { _id: portfolio._id },
        update: { $set: { totalValue: portfolio.mktValue } },
      },
    };
  });
  console.log("BULK EDIT:", JSON.stringify(bulkEdit, null, 2));
  await queries.updateAllPortfolioValues(bulkEdit);
});
