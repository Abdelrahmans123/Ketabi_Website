class AppError extends Error {
	constructor() {
		super();
	}
	create(message, statusCode) {
		this.message = message;
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
		return this;
	}
}

const appErrorInstance = new AppError();
export default appErrorInstance;
