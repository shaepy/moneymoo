const express = require("express");
const Watchlist = require("../models/watchlist.js");
const router = express.Router();
const utils = require("../utils/serverUtils.js");
const Stock = require("../models/stock.js");
const stock = require("../models/stock.js");

/* ------------------------- GET ROUTES ------------------------- */

router.get('/', async (req, res) => {
  const watchlistId = req.query.id;
  const watchlists = await Watchlist.find({ userId: req.session.user._id }).populate('stocks');
  console.log('WATCHLISTS FOUND:', watchlists);
  if (watchlistId) {
    const watchlist = await Watchlist.findById(watchlistId).populate('stocks');
      return res.render("watchlist/index", {
      watchlists: null,
      activeWatchlist: watchlist,
      stocks: null,
    });
  }
  if (watchlists.length < 1) {
    return res.render('watchlist/index', { 
      watchlists: null, 
      activeWatchlist: null,
      stocks: null,
     });
  }

  const stockLists = watchlists.filter(list => list.stocks.length > 0).map(list => list.stocks).flat();
  if (stockLists.length < 1 && stockLists) {
    console.log('NO STOCKS FOUND');
    res.render('watchlist/index', {
      watchlists: watchlists,
      activeWatchlist: null,
      stocks: null,
    });
  }

  const stocks = [...new Set(stockLists)];
  console.log('CONSOLIDATED LISTS:', stockLists);
  console.log('FINAL LIST:', stocks);

  res.render('watchlist/index', {
    watchlists: watchlists,
    activeWatchlist: null,
    stocks: stocks,
  });
});

router.get('/new', (req, res) => {
  res.render('watchlist/new');
});

router.get('/add', async (req, res) => {
  const { symbol } = req.query;
  console.log('SYMBOL FROM REQ.QUERY:', symbol);

  // FIND THE STOCK IN DATABASE
  let stock = await Stock.findOne({ symbol: symbol });
  console.log('FOUND STOCK?:', stock);

  if (!stock) {
    stock = await utils.createStockFromAPI(symbol);
    console.log('STOCK CREATED:', stock);
  }

  // get their watchlists
  const watchlists = await Watchlist.find({ userId: req.session.user._id });
  console.log('WATCHLISTS FOUND:', watchlists);

  if (watchlists.length < 1) {
    console.log('NO WATCHLISTS FOUND. REDIRECTING TO /WATCHLIST');
    return res.redirect('/watchlist');
  }

  res.render('watchlist/add', {
    stock: stock,
    watchlists: watchlists,
  });
});

/* ------------------------ POST ROUTES -------------------------- */

router.post('/', async (req, res) => {
  await Watchlist.create({ userId: req.session.user._id, name: req.body.name });
  res.redirect('/watchlist');
});

router.post('/add/:stockId', async (req, res) => {
  const {...formData} = req.body;
  console.log('WATCHLIST DATA FROM FORM:', formData);

  // * no watchlists were selected
  if (Object.keys(formData).length < 1) return res.redirect('/watchlist');
  
  Object.keys(formData).forEach(watchlist => {
    if (formData[watchlist] === 'on') formData[watchlist] = true;
    console.log(`${watchlist}: ${formData[watchlist]}`);
  });

  const stock = await Stock.findById(req.params.stockId);
  console.log('STOCK WE WANT TO ADD:', stock);

  const watchlists = await Watchlist.find({ userId: req.session.user._id });
  console.log('WATCHLISTS FOUND FOR USER:', watchlists);

  watchlists.forEach(watchlist => {
    // if watchlist.name matches any watchlist in formData
    Object.keys(formData).forEach(async key => {
      if (key === watchlist.name && key) {
        const foundList = await Watchlist.findOne({ name: watchlist.name });
        console.log('FOUND A LIST AND PUSHING STOCK:', foundList);
        foundList.stocks.push(stock);
        await foundList.save();
      }
    });
  });

  // add to all the watchlists selected 
  res.redirect('/watchlist');
});

/* ------------------------ PUT ROUTES --------------------------- */

/* ----------------------- DELETE ROUTES ------------------------- */


module.exports = router;

