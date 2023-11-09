import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Função de registro
export const register = async (req, res) => {
    const { name, email, password, role, company } = req.body;

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