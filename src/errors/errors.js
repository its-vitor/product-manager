class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class EmailInvalid extends CustomError {}
class ImageSizeError extends CustomError {}

const Errors = {
    EmailInvalid,
    ImageSizeError
};

export default Errors;