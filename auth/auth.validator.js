const {userZodSchema,loginZodSchema} = require("./userZodSchema")

const validateUser = (req, res, next) => {
  const result = userZodSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error?.errors?.map((e) => e.message) || [
      "Invalid data",
    ];
    return res.status(400).json({
      success: false,
      errors,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const result = loginZodSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.errors.map((e) => e.message),
    });
  }

  next();
};

module.exports = {validateUser , validateLogin};
