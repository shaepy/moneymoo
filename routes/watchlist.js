const express = require("express");
const Watchlist = require("../models/watchlist.js");
const router = express.Router();

/* ------------------------- GET ROUTES ------------------------- */

router.get('/', async (req, res) => {
    const watchlistId = req.query.id;
    const watchlists = await Watchlist.find({ userId: req.session.user._id });
    console.log('WATCHLISTS FOUND:', watchlists);
    if (watchlistId) {
      const watchlist = await Watchlist.findById(watchlistId);
        return res.render("watchlist/index", {
        watchlists: null,
        activeWatchlist: watchlist,
      });
    }

    if (watchlists.length > 0) {
      res.render('watchlist/index', {
        watchlists: watchlists,
        activeWatchlist: null,
      });
    } else {
      res.render('watchlist/index', {
        watchlists: null,
        activeWatchlist: null,
      });
    }
});

router.get('/new', (req, res) => {
    res.render('watchlist/new');
});

/* ------------------------ POST ROUTES -------------------------- */

router.post('/', async (req, res) => {
  await Watchlist.create({ userId: req.session.user._id, name: req.body.name });
  res.redirect('/watchlist');
});

/* ------------------------ PUT ROUTES --------------------------- */

/* ----------------------- DELETE ROUTES ------------------------- */


module.exports = router;

