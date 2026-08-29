const { validationResult } = require('express-validator');

/**
 * Express middleware runner for express-validator validation rules.
 * @param {Array} validations - Array of express-validator chain rules
 */
const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const firstError = errors.array()[0].msg;
    return res.status(400).json({
      success: false,
      message: firstError,
    });
  };
};

module.exports = validate;
