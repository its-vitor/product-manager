import User from '../models/user.js';
import Permission from '../models/permission.js'
import Company from '../models/company.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { registerToken, validateToken } from '../middlewares/token.js';

export const acceptPermission = async (req, res) => {
    try {
        let { permissionId } = req.body;

        const _id = validateToken(req.headers.authorization);
        if (!_id) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
    
        const author = await User.findOne({ _id });
        if (author.role !== 3) return res.status(400).send({ message: "Você não tem permissão para isso." })
    
        permissionId = mongoose.Types.ObjectId(permissionId);
        const permissionSource = await Permission.findOne({ permissionId });
        if (!permissionSource) return res.status(404).send({ message: 'Pedido não encontrado.' });
        const userId = permissionSource._id;
        const userSource = await User.findOne({ userId });
    
        const companySource = await Company.findOne({ cnpj: permissionSource.cnpj });
        if (!companySource) return res.status(404).send({ message: 'Empresa não encontrada.' });
    
        userSource.company = companySource._id;
        await userSource.save();
    
        res.status(200).send({ message: 'Permissão aceita e empresa atualizada.' });
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." });
    }
};

export const declinePermission = async (req, res) => {
    try {
        let { permissionId } = req.body;

        const _id = validateToken(req.headers.authorization);
        if (!_id) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
    
        const author = await User.findOne({ _id });
        if (author.role !== 3) return res.status(400).send({ message: "Você não tem permissão para isso." })
    
        permissionId = mongoose.Types.ObjectId(permissionId);
        const permissionSource = await Permission.findOne({ permissionId });
        if (!permissionSource) return res.status(404).send({ message: 'Pedido não encontrado.' });
        const userId = permissionSource._id;
    
        await User.deleteOne({ _id: userId });
    
        res.status(200).send({ message: 'Permissão recusada e usuário excluído.' });
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." });
    }
};


export const getPermissions = async (req, res) => {
    try {
        const { start, size } = req.body;

        const _id = validateToken(req.headers.authorization);
        if (!_id) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
    
        const author = await User.findOne({ _id });
        if (author.role !== 3) return res.status(400).send({ message: "Você não tem permissão para isso." })
    
        if (isNaN(start) || isNaN(size)) {
            return res.status(400).send({ message: 'Start e size devem ser números.' });
        }
    
        const permissions = await Permission.find().skip(Number(start)).limit(Number(size));
        res.status(200).send(permissions);
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." });
    }
};
