import mongoose from 'mongoose';
import Errors from '../errors/errors.js';

const productSchema = new mongoose.Schema({
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
    },
    createdByAdmin: {
        type: Boolean,
        required: false,
        default: false,
    }
});

productSchema.pre('save', function(next) {
    this.images.forEach(image => {
        const buffer = Buffer.from(image, 'base64');
        if (buffer.length / (1024*1024) > 10) {
            throw new Errors.InvalidImageType('A imagem não pode ser maior que 10MB.');
        }
    });
    next();
});

const Product = mongoose.model('Product', productSchema, 'products');

export default Product;