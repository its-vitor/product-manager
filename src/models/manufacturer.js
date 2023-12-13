import mongoose from 'mongoose';

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

const Manufacturer = mongoose.model('Manufacturer', ManufacturerSchema, 'manufacturers')

export default Manufacturer;