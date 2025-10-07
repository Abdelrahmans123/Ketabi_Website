export const findOne = async (model, query, filter, populate) => {
	try {
		return await model.findOne(query, filter).populate(populate || "");
	} catch (error) {
		console.error("Error finding document:", error);
		throw error;
	}
};
export const findAll = async (model, query = {}) => {
	try {
		return await model.find(query);
	} catch (error) {
		console.error("Error finding documents:", error);
		throw error;
	}
};
export const findById = async (model, id, filter) => {
	try {
		return await model.findById(id, filter);
	} catch (error) {
		console.error("Error finding document by ID:", error);
		throw error;
	}
};
export const create = async (model, data) => {
	try {
		const newDocument = model.create([data]);
		return await newDocument;
	} catch (error) {
		console.error("Error creating document:", error);
		throw error;
	}
};
export const update = async (model, query, data) => {
	try {
		const updatedDocument = await model.findOneAndUpdate(query, data, {
			new: true,
		});
		return updatedDocument;
	} catch (error) {
		console.error("Error updating document:", error);
		throw error;
	}
};
export const updateOne = async (model, query, data) => {
	try {
		const updatedDocument = await model.updateOne(query, data, { new: true });
		return updatedDocument;
	} catch (error) {
		console.error("Error updating document:", error);
		throw error;
	}
};
export const findByIdAndUpdate = async (model, id, data) => {
	try {
		const updatedDocument = await model.findByIdAndUpdate(id, data, {
			new: true,
		});
		return updatedDocument;
	} catch (error) {
		console.error("Error updating document by ID:", error);
		throw error;
	}
};
export const remove = async (model, query) => {
	try {
		const deletedDocument = await model.findOneAndDelete(query);
		return deletedDocument;
	} catch (error) {
		console.error("Error deleting document:", error);
		throw error;
	}
};
