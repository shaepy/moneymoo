const express = require("express");
const Portfolio = require("../models/portfolio.js");
const User = require("../models/user.js");
const router = express.Router();

router.get('/', async (req, res) => {
    // if the query param exists, then we display the thingy
    const portfolioId = req.query.id;
    console.log('req.query.id is:', portfolioId);
    console.log('req.query.id is typeof:', typeof portfolioId);
    const user = await User.findById(req.session.user._id).populate('portfolios');

    if (portfolioId && user) {
        const activePortfolio = user.portfolios.find(p => p._id.toString() === portfolioId)
        console.log('the matching portfolio is:', activePortfolio);
        return res.render('portfolio/index', {
            portfolios: null,
            activePortfolio: activePortfolio
        });
    };

    if (user) {
        res.render('portfolio/index', {
            portfolios: user.portfolios,
            activePortfolio: null
        });
    } else {
        res.render('portfolio/index', {
            portfolios: null,
            activePortfolio: null
        });
    };
});

router.get('/new', (req, res) => {
    res.render('portfolio/new');
});

router.get('/:portfolioId', async (req, res) => {
    res.send(`this is the portfolio for ${req.params.portfolioId}`)
});

router.post('/', async (req, res) => {
    const portfolio = await Portfolio.create({ userId: req.session.user._id, name: req.body.name });
    console.log('portfolio is:', portfolio);

    const user = await User.findById(req.session.user._id);
    user.portfolios.push(portfolio._id)
    await user.save();

    console.log('user should have portfolio now:', user)

    res.redirect('/portfolio');
});

module.exports = router;