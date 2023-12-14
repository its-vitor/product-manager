import mongoose from 'mongoose';
import Errors from '../errors/errors.js';

const ManufacturerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    logo: {
        type: Buffer,
        required: false,
    },
    banner: {
        type: Buffer,
        required: false,
    },
});

ManufacturerSchema.pre('save', function(next) {
    ['logo', 'banner'].forEach(imageField => {
        const image = this[imageField];
        if (image) {
            if (Buffer.from(image, 'base64').length / (1024*1024) > 10) {
                throw new Errors.InvalidImageType('A imagem não pode ser maior que 10MB.');
            }
        }
    });
    next();
});

const Manufacturer = mongoose.model('Manufacturer', ManufacturerSchema, 'manufacturers')

export default Manufacturer;
