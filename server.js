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
const userToView = require("./middleware/user-to-view.js")

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

app.get('/', (req, res) => {
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

cron.schedule("*/10 * * * *", () => {
  console.log('running a task every 10 minutes');
  // write the cron job for updating the stock prices
  // test with minutes, 1 ping per minute (200/min max)

  /*
    const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'APCA-API-KEY-ID': `${process.env.APCA-API-KEY-ID}`,
      'APCA-API-SECRET-KEY': `${process.env.APCA-API-SECRET-KEY}`
    }
    };

    # replace ${symbol} with database stock symbols
  
    async function fetchPrices() {
      try {
        const response = await fetch('https://data.alpaca.markets/v2/stocks/bars/latest?symbols=${symbol}', options);
        const data = await response.json();
        console.log(data);
      } catch (err) {
        console.error(err);
      }
    }

    fetchPrices();
  */

});