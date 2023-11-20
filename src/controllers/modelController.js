import Model from '../models/model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const getModel = async (req, res) => {
    try {
        const _id = new mongoose.Types.ObjectId(req.body._id);
        const isModel = await Model.findOne({ _id })
        if (!isModel) return res.status(404).send({message: "Não foi possível encontrar esse modelo."})
        return res.status(200).send({model: isModel})
    } catch (error) {
        return res.status(500).send({message: "Ops! Estamos em manutenção."})
    }
};

const getAllModels = async (req, res) => {
    try {
        return await Model.find();
    } catch (error) {
        return res.status(500).send({message: "Ops! Estamos em manutenção."})
    }
};

const generateModels = async (req, res) => {
    const { modelsId, column, items } = req.body
};

const registerModel = async (req, res) => {
    const { title, header, baseboard } = req.body
}