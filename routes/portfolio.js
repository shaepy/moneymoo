const express = require("express");
const Portfolio = require("../models/portfolio.js");
const router = express.Router();

router.get('/', (req, res) => {
    res.render('portfolio/index')
});

module.exports = router;