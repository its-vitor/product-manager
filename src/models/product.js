import mongoose from 'mongoose';

const Product = mongoose.Schema({
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
    manufacturer: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    images: {
        type: [Buffer],
        required: false,
        default: []
    },
    authorId: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    companyId: {
        type: mongoose.Types.ObjectId,
        required: true,
    }
});

Product.pre('save', function(next) {

});

export default Product;