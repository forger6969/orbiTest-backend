const { userZodSchema, loginZodSchema } = require("./userZodSchema");

const validateUser = (req, res, next) => {
  const result = userZodSchema.safeParse(req.body);

  if (!result.success) {
    const errors = "Invalid data";
    return res.status(400).json({
      success: false,
      errors,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const result = loginZodSchema.safeParse(req.body);
console.log(req.body);

  console.log(result);

  if (!result.success) {
    const errors = "invalid login data";

    return res.status(400).json({
      success: false,
      errors,
    });
  }

  next();
};

module.exports = { validateUser, validateLogin };
