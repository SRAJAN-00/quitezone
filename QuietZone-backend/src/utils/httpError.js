class HttpError extends Error {
  constructor(statusCode, message, codeOrDetails = undefined, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    if (typeof codeOrDetails === "string") {
      this.code = codeOrDetails;
      this.details = details;
    } else {
      this.code = undefined;
      this.details = codeOrDetails;
    }
  }
}

module.exports = HttpError;
