import mongoose from 'mongoose';

const manufacturer = mongoose.Schema({
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