// config/passport.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../user/user.model");
const Mentor = require("../mentors/mentor.model");

console.log("🔍 Google OAuth Config Check:");
console.log("CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
console.log("CLIENT_SECRET exists:", !!process.env.GOOGLE_CLIENT_SECRET);

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("❌ Google OAuth credentials are missing in .env file!");
}

// ✅ СТРАТЕГИЯ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (СТУДЕНТОВ)
passport.use(
  "google-user",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_USER,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google Profile (User):", profile);

        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log("✅ Existing user found, logging in:", user.email);
          if (!user.googleId) {
            user.googleId = profile.id;
            user.avatar = profile.photos[0]?.value;
            await user.save();
            console.log("✅ Updated existing user with Google ID");
          }
          return done(null, { user, type: "user" });
        } else {
          console.log("🆕 New user, creating account...");
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            firstName: profile.name.givenName || "google",
            lastName: profile.name.familyName || "google",
            avatar: profile.photos[0]?.value,
            username: profile.emails[0].value.split("@")[0] + "_" + Date.now(),
            role: "user",
            isProfileComplete: false,
          });
          console.log("✅ New Google user created:", user.email);
          return done(null, { user, type: "user" });
        }
      } catch (err) {
        console.error("❌ Google Auth Error (User):", err);
        return done(err, null);
      }
    }
  )
);

// ✅ СТРАТЕГИЯ ДЛЯ МЕНТОРОВ
passport.use(
  "google-mentor",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_MENTOR,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google Profile (Mentor):", profile);

        let mentor = await Mentor.findOne({ email: profile.emails[0].value });

        if (mentor) {
          console.log("✅ Existing mentor found, logging in:", mentor.email);
          if (!mentor.googleId) {
            mentor.googleId = profile.id;
            mentor.avatar = profile.photos[0]?.value;
            await mentor.save();
            console.log("✅ Updated existing mentor with Google ID");
          }
          return done(null, { mentor, type: "mentor" });
        } else {
          console.log("🆕 New mentor, creating account...");
          // Для менторов создаем базовый профиль без пароля
          mentor = await Mentor.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            firstName: profile.name.givenName || "google",
            lastName: profile.name.familyName || "google",
            avatar: profile.photos[0]?.value,
            grade: "junior", // дефолтное значение
            password: "google_auth_" + Date.now(), // временный пароль (не используется)
          });
          console.log("✅ New Google mentor created:", mentor.email);
          return done(null, { mentor, type: "mentor" });
        }
      } catch (err) {
        console.error("❌ Google Auth Error (Mentor):", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((data, done) => {
  // Сохраняем ID и тип (user или mentor)
  done(null, { id: data.user?._id || data.mentor?._id, type: data.type });
});

passport.deserializeUser(async (data, done) => {
  try {
    if (data.type === "user") {
      const user = await User.findById(data.id);
      done(null, { user, type: "user" });
    } else if (data.type === "mentor") {
      const mentor = await Mentor.findById(data.id);
      done(null, { mentor, type: "mentor" });
    }
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
