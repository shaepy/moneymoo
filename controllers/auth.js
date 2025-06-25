const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/user.js");

router.get('/sign-up', (req, res) => {
    res.render('auth/sign-up', {
        userExists: false,
        passwordsDontMatch: false
    })
});

router.get('/sign-in', (req, res) => {
    res.render('auth/sign-in', { loginError: false })
});

router.post('/sign-up', async (req, res) => {
    const validUser = await User.findOne({
        $or: [{ username: req.body.username }, { email: req.body.email }]
    });
    if (validUser) {
        return res.render("auth/sign-up", {
            userExists: true,
            passwordsDontMatch: false
        })
    };
    if (req.body.password !== req.body.confirmPassword) {
        return res.render("auth/sign-up", {
            userExists: false,
            passwordsDontMatch: true
        })
    };
    req.body.password = bcrypt.hashSync(req.body.password, 10);
    const newUser = await User.create(req.body);
    console.log(newUser);

    req.session.user = {
        username: newUser.username,
        _id: newUser._id,
    };

    req.session.save(() => {
        res.redirect("/");
    });
})

router.post('/sign-in', async (req, res) => {
    const validUser = await User.findOne({
        $or: [{ username: req.body.username }, { email: req.body.email }]
    });
    if (!validUser) return res.render("auth/sign-in", { loginError: true });

    const validPassword = bcrypt.compareSync(
        req.body.password,
        validUser.password
    );
    if (!validPassword) return res.render("auth/sign-in", { loginError: true });
    
    req.session.user = {
        username: validUser.username,
        _id: validUser._id,
    };

    req.session.save(() => {
        res.redirect("/");
    });
})

module.exports = router;