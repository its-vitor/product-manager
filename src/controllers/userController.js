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

            const user = await new User({ name, email, password, role: undefined, company: undefined }).save();
            new Permission({ cnpj, authorId: user._id, email: email}).save()

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
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."})
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
            items = await Schema.find({ $or: [{ 'company': author.company }, { 'createdByAdmin': true }] }).skip(Number(start)).limit(Number(limit));
        } else if (author.role === 2 || author.role === 3) {
            items = await Schema.find().skip(Number(start)).limit(Number(limit));
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."})
        }
        return res.status(200).send(items);
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção." })
    }
};

export const getManufacturers = async (req, res) => {
    try {
        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
        
        const _id = new mongoose.Types.ObjectId(userId);
        const author = await User.findOne({ _id });

        let manufacturers;
        if (author.role === 0 || author.role === 1 || author.role === 2 || author.role === 3) {m
            manufacturers = await Manufacturer.find({}, '_id name');
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."})
        }
        return res.status(200).send(manufacturers);
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
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."})
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
                    const existingProduct = await Product.findOne({ productId });
                    if (existingProduct) {
                        await Product.updateOne({ productId }, productData);
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
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."})
        }
    } catch (error) {
        if (error instanceof Errors.AllProductsFailed) {
            return res.status(500).send({ message: "Todos os produtos falharam ao serem registrados." });
        }
        res.status(500).send({ message: "Ops! Estamos em manutenção."})
    }
};

// arrumar
export const registerCompany = async (req, res) => {
    try {
        const { cnpj, name, members } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});

        const _id = new mongoose.Types.ObjectId(userId);
        const author = await User.findOne({ _id });

        if (author.role === 0 || author.role === 1 || author.role === 2 || author.role === 3) {
            const existingCompany = await Company.findOne({ cnpj });
            if (existingCompany) {
                return res.status(400).send({ message: "A empresa com este CNPJ já existe." });
            } else {
                const companyData = {
                    cnpj,
                    name,
                    members: [...members, _id],
                    authorId: _id,
                    createdByAdmin: author.role === 2 || author.role === 3 ? true : false
                };
                const company = new Company(companyData);
                await company.save();
                return res.status(200).send({ message: "Empresa registrada com sucesso." });
            }
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."});
        }
    } catch (error) {
        res.status(500).send({ message: "Ops! Estamos em manutenção."});
    }
};

export const registerManufacturer = async (req, res) => {
    try {
        const { name, logo, banner } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});

        const _id = new mongoose.Types.ObjectId(userId);
        const author = await User.findOne({ _id });

        if (author.role === 0 || author.role === 1 || author.role === 2 || author.role === 3) {
            const existingManufacturer = await Manufacturer.findOne({ name });
            if (existingManufacturer) {
                return res.status(400).send({ message: "O fabricante com este nome já existe." });
            } else {
                const manufacturer = new Manufacturer({
                    name,
                    logo,
                    banner,
                    createdByAdmin: author.role === 2 || author.role === 3 ? true : false
                });
                await manufacturer.save();
                return res.status(200).send({ message: "Fabricante registrado com sucesso." });
            }
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."});
        }
    } catch (error) {
        if (error instanceof Errors.InvalidImageType) {
            return res.status(500).send({ message: "Tipo de imagem inválido." });
        }
        res.status(500).send({ message: "Ops! Estamos em manutenção."});
    }
};


export const registerModel = async (req, res) => {
    try {
        const { name, header, baseboard } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});

        const _id = new mongoose.Types.ObjectId(userId);
        const author = await User.findOne({ _id });

        if (author.role === 0 || author.role === 1 || author.role === 2 || author.role === 3) {
            const company = await Company.findOne({ _id: author.company})
            if (!company) return res.status(404).send({ message: "Sua empresa já não existe. Contacte o suporte e atualize!" })

            const modelData = {
                name,
                header,
                baseboard,
                authorId: _id,
                company: company._id,
                createdByAdmin: author.role === 2 || author.role === 3 ? true : false
            };
            const model = new Model(modelData);
            await model.save();
            return res.status(200).send({ message: "Modelo registrado com sucesso." });
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."});
        }
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção."});
    }
};

export const deleteItem = async (req, res, Schema) => {
    try {
        const { _id } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});

        const authorId = new mongoose.Types.ObjectId(userId);
        const author = await User.findOne({ authorId });

        if (author.role === 0) {
            const item = await Schema.findOne({ _id, authorId });
            if (!item) return res.status(404).send({ message: "Item não encontrado."});
            await item.remove();
            return res.status(200).send({ message: "Item excluído com sucesso." });
        } else if (author.role === 1) {
            const item = await Schema.findOne({ _id, $or: [{ authorId }, { 'company': author.company }] });
            if (!item) return res.status(404).send({ message: "Item não encontrado."});
            await item.remove();
            return res.status(200).send({ message: "Item excluído com sucesso." });
        } else if (author.role === 2 || author.role === 3) {
            const item = await Schema.findOne({ _id });
            if (!item) return res.status(404).send({ message: "Item não encontrado."});
            await item.remove();
            return res.status(200).send({ message: "Item excluído com sucesso." });
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."});
        }
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção."});
    }
};

export const deleteItems = async (req, res, Schema) => {
    try {
        const { ids } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});

        const authorId = new mongoose.Types.ObjectId(userId);
        const author = await User.findOne({ authorId });

        if (author.role === 0) {
            const items = await Schema.find({ '_id': { $in: ids }, authorId });
            if (!items.length) return res.status(404).send({ message: "Itens não encontrados."});
            await Schema.deleteMany({ '_id': { $in: ids }, authorId });
            return res.status(200).send({ message: `${items.length} itens excluídos com sucesso.` });
        } else if (author.role === 1) {
            const items = await Schema.find({ '_id': { $in: ids }, $or: [{ authorId }, { 'company': author.company }] });
            if (!items.length) return res.status(404).send({ message: "Itens não encontrados."});
            await Schema.deleteMany({ '_id': { $in: ids }, $or: [{ authorId }, { 'company': author.company }] });
            return res.status(200).send({ message: `${items.length} itens excluídos com sucesso.` });
        } else if (author.role === 2 || author.role === 3) {
            const items = await Schema.find({ '_id': { $in: ids } });
            if (!items.length) return res.status(404).send({ message: "Itens não encontrados."});
            await Schema.deleteMany({ '_id': { $in: ids } });
            return res.status(200).send({ message: `${items.length} itens excluídos com sucesso.` });
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."});
        }
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção."});
    }
};

export const editProduct = async (req, res) => {
    try {
        const { _id, productId, name, price, description, images } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
        
        const authorId = new mongoose.Types.ObjectId(userId);
        const prodId = new mongoose.Types.ObjectId(_id);
        const author = await User.findOne({ authorId });

        let product;
        if (author.role === 0) {
            product = await Product.findOne({ '_id': prodId, authorId });
        } else if (author.role === 1) {
            product = await Product.findOne({ '_id': prodId, $or: [{ authorId }, { 'companyId': author.company }] });
        } else if (author.role === 2 || author.role === 3) {
            product = await Product.findOne({ '_id': prodId });
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."});
        }

        if (!product) return res.status(404).send({ message: "Produto não encontrado."});

        product.productId = productId || product.productId;
        product.name = name || product.name;
        product.price = price || product.price;
        product.description = description || product.description;
        product.images = images || product.images;

        await product.save();
        return res.status(200).send({ message: "Produto atualizado com sucesso." });
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção."});
    }
};

export const editModel = async (req, res) => {
    try {
        const { _id, name, header, baseboard } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
        
        const authorId = new mongoose.Types.ObjectId(userId);
        const modelId = new mongoose.Types.ObjectId(_id);
        const author = await User.findOne({ authorId });

        let model;
        if (author.role === 0) {
            model = await Model.findOne({ '_id': modelId, authorId });
        } else if (author.role === 1) {
            model = await Model.findOne({ '_id': modelId, $or: [{ authorId }, { 'company': author.company }] });
        } else if (author.role === 2 || author.role === 3) {
            model = await Model.findOne({ '_id': modelId });
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."});
        }

        if (!model) return res.status(404).send({ message: "Modelo não encontrado."});
        
        model.name = name || model.name;
        model.header = header ? Buffer.from(header, 'base64') : model.header;
        model.baseboard = baseboard ? Buffer.from(baseboard, 'base64') : model.baseboard;

        await model.save();
        return res.status(200).send({ message: "Modelo atualizado com sucesso." });
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção."});
    }
};

export const editManufacturer = async (req, res) => {
    try {
        const { _id, name, logo, banner } = req.body;

        const userId = validateToken(req.headers.authorization);
        if (!userId) res.status(404).send({ message: "Sessão expirada. Realize re-login."});
        
        const authorId = new mongoose.Types.ObjectId(userId);
        const manufacturerId = new mongoose.Types.ObjectId(_id);
        const author = await User.findOne({ authorId });

        let manufacturer;
        if (author.role === 0) {
            manufacturer = await Manufacturer.findOne({ '_id': manufacturerId, authorId });
        } else if (author.role === 1) {
            manufacturer = await Manufacturer.findOne({ '_id': manufacturerId, $or: [{ authorId }, { 'company': author.company }] });
        } else if (author.role === 2 || author.role === 3) {
            manufacturer = await Manufacturer.findOne({ '_id': manufacturerId });
        } else {
            return res.status(500).send({ message: "Você ainda não tem permissão para essa função."});
        }

        if (!manufacturer) return res.status(404).send({ message: "Fabricante não encontrado."});
        
        manufacturer.name = name || manufacturer.name;
        manufacturer.logo = logo ? Buffer.from(logo, 'base64') : manufacturer.logo;
        manufacturer.banner = banner ? Buffer.from(banner, 'base64') : manufacturer.banner;

        await manufacturer.save();
        return res.status(200).send({ message: "Fabricante atualizado com sucesso." });
    } catch {
        return res.status(500).send({ message: "Ops! Estamos em manutenção."});
    }
};

export const generateModels = async (req, res) => {
    const { modelsId, column, items } = req.body
};
