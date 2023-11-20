import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { adminIpsPermission, shopIpsPermission } from '../config/allowedIps.js';

dotenv.config();

// Função de registro
export const register = async (req, res) => {
    const { name, email, password, role, company } = req.body;

    if (role === 3 || ![0, 1, 2].includes(role)) {
        return res.status(400).send({ message: "Você não tem permissão para realizar essa tarefa." });
    }

    if ([1, 2].includes(role)) {
        const clientIp = req.ip;
        const allowedIps = role === 1 ? shopIpsPermission : adminIpsPermission;

        if (!allowedIps.includes(clientIp)) {
            return res.status(403).send({ message: "Você não possui permissão para isso. Contacte o suporte." });
        }
    }

    if (![2, 3].includes(role) && !company) {
        return res.status(400).send({ message: "É necessário que sua conta esteja associada a uma empresa." });
    }

    try {
        await new User({ name, email, password, role, company }).save();
        res.status(201).send({ message: 'Usuário registrado com sucesso!' });
    } catch (err) {
        if (err instanceof Errors.EmailInvalid) {
            res.status(405).send({ message: "Endereço de email inválido." });
        } else {
            res.status(500).send({ message: "Ops! Estamos em manutenção."})
        }
    }
};


// Função de login
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            res.status(404).send({ message: "Email não registrado." });
        }

        if (!await user.isValidPassword(password)) {
            res.status(405).send({ message: "Senha incorreta. Tente novamente." });
        }

        res.send({ token: jwt.sign({ _id: user._id }, process.env.KEY) });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

// Função de adicionar uma foto de perfil para usuário
export const addProfilePicture = async (req, res) => {
    try {
        const { _id } = jwt.verify(req.header('Authorization'), process.env.KEY);
        const user = await User.findById(_id);
        if (!user) {
            res.status(404).send({ message: "Sessão expirada. Realize re-login."})
        }

        user.profilePicture = req.body.profilePicture;
        await user.save();

        res.status(200).send({ message: 'Foto de perfil adicionada com sucesso!' });
    } catch (error) {
        res.status(500).send({ message: "Ops! Estamos em manutenção." });
    }
};