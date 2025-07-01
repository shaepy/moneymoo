const express = require("express");
const router = express.Router();

/* ------------------------- GET ROUTES -------------------------- */

router.get('/', (req, res) => {
    res.send('stock index');
});

router.get('/:stockSymbol', (req, res) => {
    // grab data from API to create the show pages
    res.send(`stock symbol page for ${req.params.stockSymbol}`);
});

/* ------------------------- POST ROUTES -------------------------- */

/* ------------------------- PUT ROUTES -------------------------- */

/* ------------------------ DELETE ROUTES ------------------------ */

/* ------------------------- FUNCTIONS --------------------------- */

module.exports = router;