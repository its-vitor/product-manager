import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    cnpj: {
        type: Number,
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
    createdByAdmin: {
        type: Boolean,
        required: false,
        default: false,
    },
});

const Company = mongoose.model('Company', companySchema, 'companys')

export default Company;