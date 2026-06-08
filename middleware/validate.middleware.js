const { validationResult } = require('express-validator');

/**
 * Middleware để xử lý kết quả validation
 * Nếu có lỗi, trả về 400 Bad Request kèm theo danh sách lỗi
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

module.exports = validate;
