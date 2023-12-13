import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const registerToken = (userId) => {
    return jwt.sign({ _id: userId }, process.env.KEY);
};

export const validateToken = (token) => {
    if (!jwt.verify(token, process.env.KEY)) {
        return null;
    }

    try {
        return new mongoose.Types.ObjectId(jwt.decode(token, process.env.KEY)._id);
    } catch {
        return null;
    }
} 