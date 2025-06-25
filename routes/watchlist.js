const express = require("express");
const Watchlist = require("../models/watchlist.js");
const router = express.Router();

router.get('/', (req, res) => {
    res.render('watchlist/index')
});

module.exports = router;