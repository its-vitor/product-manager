import mongoose from 'mongoose';
import sharp from 'sharp';

const model = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    header: {
        type: Buffer,
        required: true,
    },
    baseboard: {
        type: Buffer,
        required: true,
    },
});

model.pre('save', async function (next) {

    if (this.isModified('header')) {
        this.header = await sharp(this.header)
            .resize(775, 250)
            .toBuffer();
    }

    if (this.isModified('baseboard')) {
        this.baseboard = await sharp(this.baseboard)
            .resize(775, 77)
            .toBuffer();
    }

    next();
});
