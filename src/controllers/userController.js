import User from '../models/user.js';
import Model from '../models/model.js';
import Invite from '../models/invite.js';
import Permission from '../models/permission.js'
import Product from '../models/product.js'
import Manufacturer from '../models/manufacturer.js';
import Company from '../models/company.js';
import Product from '../models/product.js';
import Errors from '../errors/errors.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { registerToken, validateToken } from '../middlewares/token.js';

dotenv.config();

export const register = async (req, res) => {
    let { name, email, password, inviteId, cnpj } = req.body;
    
    if (inviteId && !cnpj) {
        try {
            inviteId = new mongoose.Types.ObjectId(inviteId);
            const inviteSrc = await Invite.findOne({ inviteId });
            if (inviteSrc.itsUsed) return res.status(400).send({ message: 'Este convite já foi usado.' });
            const { role, company } = inviteSrc;
            await new User({ name, email, password, role, company }).save();
            await Invite.updateOne({ inviteId }, { itsUsed: true });
            return res.status(201).send({ message: 'Usuário registrado com sucesso!' });
        } catch (err) {
            if (err instanceof Errors.EmailInvalid) {
                return res.status(405).send({ message: "Endereço de email inválido." });
            } else {
                return res.status(500).send({ message: "Ops! Estamos em manutenção."})
            }
        }
    } else if (cnpj && !inviteId) {
        try {
            const response = await fetch(`https://api-publica.speedio.com.br/buscarcnpj?cnpj=${cnpj}`);
            const data = await response.json();

            if (data.UF !== 'RJ') {
                return res.status(405).send({ message: "O CNPJ não é do estado do RJ" });
            }

            await new User({ name, email, password, role: undefined, company: undefined }).save();
            new Permission({ cnpj, authorId: undefined, email: email}).save()

            return res.status(201).send({ message: "Usuário registrado. Aguarde sua autorização." });
        } catch (error) {
            return res.status(500).send({ message: "Ops! Estamos em manutenção."})
        }
    } else {
        return res.status(405).send({ message: "Forneça as informações necessárias para registro."})
    }
}

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

        res.send({ token: registerToken(user._id) });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

// Função de adicionar uma foto de perfil para usuário
export const addProfilePicture = async (req, res) => {
    try {
        const _id = validateToken(req.headers.authorization);
        if (!_id) res.status(404).send({ message: "Sessão expirada. Realize re-login."});

        const user = await User.findById(_id);

        user.profilePicture = req.body.profilePicture;
        await user.save();

        res.status(200).send({ message: 'Foto de perfil adicionada com sucesso!' });
    } catch (error) {
        res.status(500).send({ message: "Ops! Estamos em manutenção." });
    }
};

export const generateInvite = async (req, res) => {
    const { role } = req.body;
    const _id = validateToken(req.headers.authorization);
    if (!_id) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
    const company = await User.findById({ _id }).company

    try {
        const invite = await new Invite({role: role, authorId: _id, company: company}).save();
        res.status(200).send({ message: invite._id })
    } catch {
        res.status(500).send({ message: "Ops! Estamos em manutenção." });
    }
};

export const getModel = async (req, res) => {
    try {
        const _id = validateToken(req.headers.authorization);
        if (!_id) res.status(404).send({ message: "Sessão expirada. Realize re-login."});

        const modelId = new mongoose.Types.ObjectId(req.body._id);
        const author = await User.findOne({ _id });
        
        let model;
        if (author.role === 0 || author.role === 1) {
            model = await Model.findOne({ _id: modelId });
            if (!model) return res.status(404).send({message: "Não foi possível encontrar esse modelo."})
            if (model.company === author.company || model.createdByAdmin) return res.status(200).send({ model });
        } else if (author.role === 2 || author.role === 3) {
            model = await Model.findOne({ _id: modelId });
            return res.status(200).send({ model });
        } else {
            return res.status(500).send({ message: "Cargo inexistente. Contacte o suporte."})
        }
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." })
    }
};

export const getModels = async (req, res) => {
    try {
        const { start, size } = req.body;

        const _id = validateToken(req.headers.authorization);
        if (!_id) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
    
        const author = await User.findOne({ _id });
        let models;
        if (author.role === 0 || author.role === 1) {
            models = await Model.find({ 'company': author.company }).skip(Number(start)).limit(Number(size));
        } else if (author.role === 2 || author.role === 3) {
            models = await Model.find().skip(Number(start)).limit(Number(size));
        } else {
            return res.status(500).send({ message: "Cargo inexistente. Contacte o suporte."})
        }
        return res.status(200).send(models);
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." })
    }
};

/**
 * Getter que retorna um item da API `(Empresas, Fabricantes, Produtos)`
 * @returns 
 */
export const getItem = async (req, res, Schema) => {
    try {
        const { itemId } = req.body;
        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});

        const _id = new mongoose.Types.ObjectId(userId)
        const author = await User.findOne({ _id });
        const item = await Schema.findOne({ _id: new mongoose.Types.ObjectId(itemId) })
        if (author.role === 0 || author.role === 1) {
            if (!item) return res.status(404).send({message: "Não foi possível encontrar esse produto."})
            if (item.company === author.company || item.createdByAdmin) return res.status(200).send({ item });
        } else if (author.role === 2 || author.role === 3) {
            return res.status(200).send({ item });
        } else {
            return res.status(500).send({ message: "Cargo inexistente. Contacte o suporte."})
        }
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." })
    }
};

/**
 * Getter que retorna todos os itens da API `(Empresas, Fabricantes, Produtos)`
 * @returns 
 */
export const getItems = async (req, res, Schema) => {
    try {
        const { start, limit } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
        
        const _id = new mongoose.Types.ObjectId(userId);
        const author = await User.findOne({ _id });

        let items;
        if (author.role === 0 || author.role === 1) {
            items = await Schema.find({ 'company': author.company }).skip(Number(start)).limit(Number(limit));
        } else if (author.role === 2 || author.role === 3) {
            items = await Schema.find().skip(Number(start)).limit(Number(limit));
        } else {
            return res.status(500).send({ message: "Cargo inexistente. Contacte o suporte."})
        }
        return res.status(200).send(items);
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." })
    }
};

export const getCompanyMembers = async (req, res) => {
    try {
        const { companyId } = req.body;

        const _id = validateToken(req.headers.authorization);
        if (!_id) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
        
        const author = await User.findOne({ _id });
        const company = await Company.findOne({ _id: new mongoose.Types.ObjectId(companyId)})
        if (author.role === 0 || author.role === 1) {
            if (author.company === company._id) {
                const members = await User.find({ _id: { $in: company.members } }, { email: 0, password: 0 })
                return res.status(200).send({ members })
            } else {
                return res.status(405).send({ message: "Você não pertence a essa empresa." })
            }
        } else if (author.role === 2 || author.role === 3) {
            const members = await User.find({ '_id': { $in: company.members } }, { email: 0, password: 0 })
            return res.status(200).send({ members })
        } else {
            return res.status(500).send({ message: "Cargo inexistente. Contacte o suporte."})
        }
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." })
    }
};

export const registerProducts = async (req, res) => {
    try {
        const { items } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
        
        const _id = new mongoose.Types.ObjectId(userId);
        const author = await User.findOne({ _id });

        if (author.role === 0 || author.role === 1 || author.role === 2 || author.role === 3) {
            const company = await Company.findOne({ _id: author.company})
            if (!company) return res.status(404).send({ message: "Sua empresa já não existe. Contacte o suporte e atualize!" })

            let successCount = 0;
            let errorCount = 0;

            for (let item of items) {
                const { productId, name, price, description, manufacturer, images } = item;
                const manufacturerCompany = await Manufacturer.findOne({ name: manufacturer.toUpperCase() })
                if (!manufacturerCompany) {
                    errorCount++;
                    continue;
                }
                const productData = {
                    productId,
                    name,
                    price,
                    description,
                    manufacturer: manufacturerCompany._id,
                    images,
                    authorId: _id,
                    companyId: company._id,
                    createdByAdmin: author.role === 2 || author.role === 3 ? true : false
                };
                try {
                    if (await Product.findOne({ name })) {
                        await Product.updateOne({ name }, productData);
                    } else {
                        const product = new Product(productData);
                        await product.save();
                    }
                    successCount++;
                } catch {
                    errorCount++;
                }
            }

            if (errorCount === items.length) {
                throw new Errors.AllProductsFailed();
            }

            return res.status(200).send({ message: `${successCount} produtos registrados com sucesso. ${errorCount} falharam.` })
        } else {
            return res.status(500).send({ message: "Cargo inexistente. Contacte o suporte."})
        }
    } catch (error) {
        if (error instanceof Errors.AllProductsFailed) {
            return res.status(500).send({ message: "Todos os produtos falharam ao serem registrados." });
        }
        res.status(500).send({ message: "Ops! Estamos em manutenção."})
    }
};


export const registerCompanys = async (req, res) => {
    const { } = req.body;
};

export const registerManufacturers = async (req, res) => {
    const { } = req.body;
};

export const registerModel = async (req, res) => {
    const { title, header, baseboard } = req.body
}

export const generateModels = async (req, res) => {
    const { modelsId, column, items } = req.body
};
