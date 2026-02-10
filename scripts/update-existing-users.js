// scripts/update-existing-users.js
require("dotenv").config();
const mongoose = require("mongoose");
const { User } = require("../user/user.model");

async function updateExistingUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Обновляем всех пользователей без поля isProfileComplete
    const result = await User.updateMany(
      { isProfileComplete: { $exists: false } },
      { $set: { isProfileComplete: true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} existing users`);

    // Проверяем пользователей с groupID - они точно завершены
    const withGroup = await User.updateMany(
      {
        groupID: { $ne: null },
        isProfileComplete: false,
      },
      { $set: { isProfileComplete: true } }
    );

    console.log(`✅ Updated ${withGroup.modifiedCount} users with groups`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

updateExistingUsers();
