const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    symbol: { type: String, required: true },
    company: { type: String, required: true },
    country: { type: String, required: true },
    industry: { type: String, required: true },
    exchange: { type: String, required: true },
    sector: { type: String, required: true },
    isEtf: { type: Boolean, required: true },
    isFund: { type: Boolean, required: true },
    price: { type: Number, required: true },  // this needs to be updated regularly
    image: { type: String },
    timestamps: true
});

module.exports = mongoose.model("Stock", stockSchema);