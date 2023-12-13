import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
    cnpj: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    authorId: {
        type: mongoose.Types.ObjectId,
        required: false,
        default: null,
    },
});

const Permission = mongoose.model('Permission', permissionSchema, 'permissions')

export default Permission;