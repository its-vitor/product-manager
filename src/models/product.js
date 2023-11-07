import mongoose from 'mongoose';

const product = mongoose.Schema({
    productId: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    images: {
        type: [Buffer],
        required: false,
        default: []
    },
});

product.pre('save', function(next) {

});