const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const morgan = require("morgan");
const session = require('express-session');
// const MongoStore = require("connect-mongo");
const cron = require("node-cron");

const portfolioRoutes = require("./routes/portfolio.js");
const watchlistRoutes = require("./routes/watchlist.js");
const searchRoutes = require("./routes/search.js");
const stockRoutes = require("./routes/stock.js");
const authController = require("./controllers/auth.js")
const userToView = require("./middleware/user-to-view.js");
const Stock = require("./models/stock.js");
const utils = require("./utils/serverUtils.js")

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
  await testCron();
  res.render("index");
});

app.use('/portfolio', portfolioRoutes);
app.use('/watchlist', watchlistRoutes);
app.use('/search', searchRoutes);
app.use('/stock', stockRoutes);

app.listen(process.env.PORT, () => {
  console.log(`App is listening on port ${process.env.PORT}`);
});

/* --------- FETCH CURRENT STOCK PRICES --------- */

cron.schedule("*/45 * * * *", async () => {
  console.log("RUNNING A CRON JOB TO UPDATE STOCK PRICES. SET TO EVERY 45 MIN");
  // test with minutes, 1 ping per minute (200/min max)
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
  console.log("BULKOPS:", bulkOps);

  await utils.updateStockPrices(bulkOps);
});
