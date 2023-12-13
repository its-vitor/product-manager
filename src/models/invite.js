import mongoose from 'mongoose';

const InviteSchema = new mongoose.Schema({
    cnpj: {
        type: Number,
        required: true,
        unique: true,
    },
    role: {
        type: Number,
        required: true,
    },
    authorId: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    company: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    itsUsed: {
        type: Boolean,
        required: true,
        default: false,
    },
});

const Invite = mongoose.model('Invite', InviteSchema, 'invites');

export default Invite;