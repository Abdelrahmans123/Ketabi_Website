export const findOne = async ({
    model,
    query,
    filter = null,
    populate = null,
    sort = null,
}) => {
    let queryBuilder = model.findOne(query, filter);

    if (populate) {
        queryBuilder = queryBuilder.populate(populate);
    }
    if (sort) {
        queryBuilder = queryBuilder.sort(sort);
    }

    return await queryBuilder;
};

export const findAll = async ({
    model,
    filter = null,
    populate = null,
    sort = null,
    skip = null,
    limit = null,
    select = null,
}) => {
    let queryBuilder = model.find(filter);

    if (populate) {
        queryBuilder = queryBuilder.populate(populate);
    }
    if (sort) {
        queryBuilder = queryBuilder.sort(sort);
    }
    if (select) {
        queryBuilder = queryBuilder.select(select);
    }
    if (skip) {
        queryBuilder = queryBuilder.skip(skip);
    }
    if (limit) {
        queryBuilder = queryBuilder.limit(limit);
    }

    return await queryBuilder;
};

export const findById = async ({
    model,
    id,
    select = null,
    populate = null,
    sort = null
}) => {
    let queryBuilder = model.findById(id);

    if (populate) {
        queryBuilder = queryBuilder.populate(populate);
    }
    if (sort) {
        queryBuilder = queryBuilder.sort(sort);
    }
    if (select) {
        queryBuilder = queryBuilder.select(select);
    }
    return await queryBuilder;
};

export const findBySlug = async ({ model, slug, filter = null }) => {
    return await model.findOne({ slug }, filter);
};

export const create = async ({ model, data }) => {
    const newDocument = await model.create(data);
    return newDocument;
};

export const update = async ({ model, query, data }) => {
    const updatedDocument = await model.findOneAndUpdate(query, data, {
        new: true,
    });
    return updatedDocument;
};

export const updateOne = async ({ model, query, data }) => {
    const updatedDocument = await model.updateOne(query, data, {
        new: true,
    });
    return updatedDocument;
};

export const findByIdAndUpdate = async ({
    model,
    id,
    data,
    populate = null,
}) => {
    let queryBuilder = model.findByIdAndUpdate(id, data, { new: true });

    if (populate) {
        queryBuilder = queryBuilder.populate(populate);
    }

    const updatedDocument = await queryBuilder;
    return updatedDocument;
};

export const findOneAndUpdate = async ({ model, query, data }) => {
    const updatedDocument = await model.findOneAndUpdate(query, data, {
        new: true,
    });
    return updatedDocument;
};

export const findBySlugAndUpdate = async ({ model, slug, data }) => {
    const updatedDocument = await model.findOneAndUpdate({ slug }, data, {
        new: true,
    });
    return updatedDocument;
};

export const remove = async ({ model, query }) => {
    const deletedDocument = await model.findOneAndDelete(query);
    return deletedDocument;
};

export const findBySlugAndDelete = async ({ model, slug }) => {
    const deletedDocument = await model.findOneAndDelete({ slug });
    return deletedDocument;
};
export const deleteMany = async ({ model, filter }) => {
    const result = await model.deleteMany(filter);
    return result;
};
