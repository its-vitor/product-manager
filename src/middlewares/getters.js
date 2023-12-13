export const getOne = async (Schema, ID) => {
    const item = await Schema.findOne({ _id: ID })
    if (author.role === 0 || author.role === 1) {
        if (!item) return res.status(404).send({message: "Não foi possível encontrar esse produto."})
        if (item.company === author.company || item.createdByAdmin) return res.status(200).send({ item });
    } else if (author.role === 2 || author.role === 3) {
        return res.status(200).send({ item });
    } else {
        return res.status(500).send({ message: "Cargo inexistente. Contacte o suporte."})
    }
};

export const getAll = async () => {

};
