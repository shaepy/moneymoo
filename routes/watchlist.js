const express = require("express");
const router = express.Router();
const utils = require("../utils/serverUtils.js");
const Stock = require("../models/stock.js");
const User = require("../models/user.js");
const Watchlist = require("../models/watchlist.js");
const isSignedIn = require("../middleware/is-signed-in.js");

/* ------------------------- GET ROUTES ------------------------- */

router.get('/', isSignedIn, async (req, res) => {
  const watchlistId = req.query.id;
  const watchlists = await Watchlist.find({ userId: req.session.user._id }).populate('stocks');
  console.log('WATCHLISTS FOUND:', watchlists);
  if (watchlistId) {
    const watchlist = await Watchlist.findById(watchlistId).populate('stocks');
    if (req.query.edit) watchlist.edit = true;
      return res.render("watchlist/index", {
      watchlists: watchlists,
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
  console.log('CONSOLIDATED LISTS:', stockLists);
  if (stockLists.length < 1 && stockLists) {
    console.log('NO STOCKS FOUND');
    return res.render('watchlist/index', {
      watchlists: watchlists,
      activeWatchlist: null,
      stocks: null,
    });
  }
  const stocks = [...new Set(stockLists)];
  console.log('FINAL LIST:', stocks);

  res.render('watchlist/index', {
    watchlists: watchlists,
    activeWatchlist: null,
    stocks: stocks,
  });
});

router.get('/new', isSignedIn, (req, res) => {
  res.render('watchlist/new');
});

router.get('/add', isSignedIn, async (req, res) => {
  const { symbol } = req.query;
  console.log('SYMBOL FROM REQ.QUERY:', symbol);

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

router.get("/:watchlistId/remove", isSignedIn, async (req, res) => {
  const watchlist = await Watchlist.findById(req.params.watchlistId).populate("stocks");
  res.render("watchlist/remove", {
    watchlist,
  });
});

/* ------------------------ POST ROUTES -------------------------- */

router.post('/', async (req, res) => {
  const watchlist = await Watchlist.create({ userId: req.session.user._id, name: req.body.name });
  const user = await User.findById(req.session.user._id);
  user.watchlists.push(watchlist);
  await user.save();
  res.redirect('/watchlist');
});

// add stock to watchlist
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
  res.redirect('/watchlist');
});

/* ------------------------ PUT ROUTES --------------------------- */

router.put('/:watchlistId', async (req, res) => {
  await Watchlist.findByIdAndUpdate(req.params.watchlistId, { name: req.body.name });
  res.redirect(`/watchlist?id=${req.params.watchlistId}`);
});

// PUT that acts as a delete (removing stocks from watchlist
router.put('/:watchlistId/remove', async (req, res) => {
  const watchlist = await Watchlist.findById(req.params.watchlistId).populate("stocks");
  const stockId = req.query.id;
  watchlist.stocks.pull(stockId);
  await watchlist.save();
  res.redirect(`/watchlist?id=${watchlist._id}`);
});

/* ----------------------- DELETE ROUTES ------------------------- */

router.delete('/:watchlistId', async (req, res) => {
  const watchlist = await Watchlist.findById(req.params.watchlistId);
  const user = await User.findById(watchlist.userId);
  user.watchlists.pull(watchlist._id);
  await user.save();
  await watchlist.deleteOne();
  res.redirect('/watchlist');
});

module.exports = router;

