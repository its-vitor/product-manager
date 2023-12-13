class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class EmailInvalid extends CustomError {}
class ImageSizeError extends CustomError {}
class InvalidImageType extends CustomError {}
class AllProductsFailed extends CustomError {}

const Errors = {
    EmailInvalid,
    ImageSizeError,
    InvalidImageType,
    AllProductsFailed,
};

export default Errors;