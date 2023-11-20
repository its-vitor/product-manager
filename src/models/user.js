import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Errors from '../errors/errors.js';

/**
 * ## Esquema da entidade Usuário
 * @property `name` trata-se do nome de usuário daquela respectiva conta.
 * @property `email` é o endereço de email do usuário.
 * @property `password` é a senha do usuário.
 * @property `role` é o cargo que o usuário exerce. (0: Estagiário, 1: Lojista, 2: Administrador, 3: Staff)
 * @property `company` é o ID da compania que o usuário pertence.
 */
const User = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: Number,
        required: true,
        default: 0,
    },
    company: {
        type: mongoose.Types.ObjectId,
        required: false,
    },
    profilePicture: {
        type: Buffer,
        required: false,
        default: null,
        // validação se a imagem excede o tamanho de 10mb.
        validate(value) {
            if (value) {
                if (value.length > 10 * 1024 * 1024) {
                    throw new Errors.ImageSizeError('A foto do perfil não pode ser maior que 10MB.');
                }
            }
        }
    },
});

// validação do email
User.pre('save', function(next) {
    const isValid = String(this.email)
          .toLowerCase()
          .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    
    if (isValid) next();
    else throw new Errors.EmailInvalid("Endereço de email inválido.");
});

// criptografia da senha no banco de dados
User.pre('save', function(next) {
    if (this.isModified('password')) this.password = bcrypt.hashSync(this.password, 10);
    next();
});

// verificação da senha
User.methods.isValidPassword = function(password) {
    return bcrypt.compare(password, this.password);
};

export default User;