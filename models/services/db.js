export const findOne = async (model, query, filter, populate, sort) => {
    return await model
        .findOne(query, filter)
        .populate(populate || "")
        .sort(sort || "");
};
export const findAll = async (model, filter = {}) => {
    return await model.find({}, filter);
};
export const findById = async (model, id, filter) => {
    return await model.findById(id, filter);
};
export const findBySlug = async (model, slug, filter) => {
    return await model.findOne({ slug }, filter);
};

export const create = async (model, data) => {
    const newDocument = await model.create(data);
    return newDocument;
};
export const update = async (model, query, data) => {
    const updatedDocument = await model.findOneAndUpdate(query, data, {
        new: true,
    });
    return updatedDocument;
};
export const updateOne = async (model, query, data) => {
    const updatedDocument = await model.updateOne(query, data, {
        new: true,
    });
    return updatedDocument;
};
export const findByIdAndUpdate = async (model, id, data) => {
    const updatedDocument = await model.findByIdAndUpdate(id, data, {
        new: true,
    });
    return updatedDocument;
};
export const findOneAndUpdate = async (model, query, data) => {
    const updatedDocument = await model.findOneAndUpdate(query, data, {
        new: true,
    });
    return updatedDocument;
};
export const findBySlugAndUpdate = async (model, slug, data) => {
    const updatedDocument = await model.findOneAndUpdate({ slug }, data, {
        new: true,
    });
    return updatedDocument;
};

export const remove = async (model, query) => {
    const deletedDocument = await model.findOneAndDelete(query);
    return deletedDocument;
};
export const findBySlugAndDelete = async (model, slug) => {
    const deletedDocument = await model.findOneAndDelete({ slug });
    return deletedDocument;
};
