import mongoose from 'mongoose';

const Company = mongoose.Schema({
    cnpj: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    members: {
        type: [mongoose.Types.ObjectId],
        required: true,
        default: [],
        
    },
    authorId: {
        type: mongoose.Types.ObjectId,
        required: false,
        default: null,
    },
});

export default Company;