const { z } = require("zod");

const userZodSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters"),

  email: z.string().email("Invalid email address"),

  password: z.string().min(6, "Password must be at least 6 characters"),
  
  firstName: z.string().min(2, "First name is too short"),
  lastName: z.string().min(2, "Last name is too short"),
  groupID: z.string().optional(),
});


const loginZodSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});


module.exports = { userZodSchema, loginZodSchema };