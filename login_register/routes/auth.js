const crypto = require("crypto");
const { sendEmail } = require("../utils/sendEmail");const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Please enter valid details."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 80) {
      return res.status(400).json({
        message: "Name is required and must be under 80 characters."
      });
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        message: "Please enter a valid email."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must be 8–72 characters."
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword
    });

    return res.status(201).json({
      message: "Registration successful. Please log in."
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    console.error("Register error:", error.message);
    return res.status(500).json({
      message: "Something went wrong."
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: "Please enter valid credentials."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Create a fresh session after successful login.
    req.session.regenerate((error) => {
      if (error) {
        return res.status(500).json({
          message: "Could not create a session."
        });
      }

      req.session.userId = user._id.toString();

      req.session.save((saveError) => {
        if (saveError) {
          return res.status(500).json({
            message: "Could not save your session."
          });
        }

        return res.json({
          message: "Login successful."
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Something went wrong."
    });
  }
});

// AUTHENTICATION MIDDLEWARE
async function requireAuth(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first."
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user) {
      return req.session.destroy(() => {
        res.status(401).json({
          message: "Please log in again."
        });
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(500).json({
      message: "Authentication check failed."
    });
  }
}

// PROTECTED ENDPOINT
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    }
  });
});


/* UPDATE PROFILE NAME */
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string") {
      return res.status(400).json({
        message: "Please enter a valid name."
      });
    }

    const cleanName = name.trim();

    if (!cleanName || cleanName.length > 80) {
      return res.status(400).json({
        message: "Name must be between 1 and 80 characters."
      });
    }

    req.user.name = cleanName;
    await req.user.save();

    return res.json({
      message: "Profile updated successfully.",
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error("Profile update error:", error.message);

    return res.status(500).json({
      message: "Could not update profile."
    });
  }
});


/* CHANGE PASSWORD */
router.patch("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      currentPassword.length > 72 ||
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return res.status(400).json({
        message: "Enter a valid current password and a new password of 8–72 characters."
      });
    }

    // Fetch the user's stored password hash
    const user = await User.findById(req.session.userId)
      .select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Please log in again."
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect."
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from the current password."
      });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Destroy this session; user must log in again
    req.session.destroy((error) => {
      if (error) {
        console.error("Session destroy error:", error.message);
        return res.status(500).json({
          message: "Password changed, but session cleanup failed. Please log in again."
        });
      }

      res.clearCookie("sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      });

      return res.json({
        message: "Password changed successfully. Please log in again."
      });
    });
  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      message: "Could not change password."
    });
  }
});

// LOGOUT
router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.json({ message: "Logged out." });
  }

  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Could not log out."
      });
    }

    res.clearCookie("sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    return res.json({
      message: "Logged out successfully."
    });
  });
});


const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// REQUEST PASSWORD RESET OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email || email.length > 254) {
      return res.status(400).json({
        message: "Please enter a valid email."
      });
    }

    const user = await User.findOne({ email });

    // Same response whether the account exists or not.
    if (!user) {
      return res.json({
        message: "If the account exists, an OTP will be sent."
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.resetOtpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    user.resetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.resetOtpAttempts = 0;
    user.resetOtpVerified = false;

    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset OTP",
        text: `Your password reset OTP is ${otp}. It expires in 5 minutes. If you did not request this, ignore this email.`,
        html: `<p>Your password reset OTP is <strong>${otp}</strong>.</p><p>It expires in 5 minutes. If you did not request this, ignore this email.</p>`
      });
    } catch (emailError) {
      // Invalidate the OTP if delivery fails.
      user.resetOtpHash = undefined;
      user.resetOtpExpires = undefined;
      user.resetOtpAttempts = 0;
      user.resetOtpVerified = false;
      await user.save();

      console.error("Reset OTP email failed:", emailError.message);

      return res.status(503).json({
        message: "Could not send OTP. Please try again later."
      });
    }

    return res.json({
      message: "If the account exists, an OTP will be sent."
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      message: "Could not process your request."
    });
  }
});

// VERIFY PASSWORD RESET OTP
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const otp =
      typeof req.body.otp === "string"
        ? req.body.otp.trim()
        : "";

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Enter a valid email and 6-digit OTP."
      });
    }

    const user = await User.findOne({ email })
      .select("+resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpVerified");

    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpires ||
      user.resetOtpExpires.getTime() <= Date.now() ||
      user.resetOtpVerified ||
      user.resetOtpAttempts >= MAX_OTP_ATTEMPTS
    ) {
      return res.status(400).json({
        message: "OTP is invalid or expired. Request a new OTP."
      });
    }

    user.resetOtpAttempts += 1;

    const submittedHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const valid = crypto.timingSafeEqual(
      Buffer.from(user.resetOtpHash, "hex"),
      Buffer.from(submittedHash, "hex")
    );

    if (!valid) {
      if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
        user.resetOtpHash = undefined;
        user.resetOtpExpires = undefined;
        user.resetOtpVerified = false;
      }

      await user.save();

      return res.status(400).json({
        message: "OTP is incorrect or expired."
      });
    }

    user.resetOtpVerified = true;
    await user.save();

    return res.json({
      message: "OTP verified. You can now reset your password."
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      message: "Could not verify OTP."
    });
  }
});

// RESET PASSWORD AFTER OTP VERIFICATION
router.post("/reset-password", async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const newPassword = req.body.newPassword;

    if (
      !email ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return res.status(400).json({
        message: "Enter a valid email and password of 8–72 characters."
      });
    }

    const user = await User.findOne({ email })
      .select("+password +resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpVerified");

    if (
      !user ||
      !user.resetOtpVerified ||
      !user.resetOtpHash ||
      !user.resetOtpExpires ||
      user.resetOtpExpires.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "Please verify a valid OTP first."
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;
    user.resetOtpVerified = false;

    await user.save();

    // Invalidate all existing sessions for this user.
    const sessionStore = req.sessionStore;

    if (sessionStore && typeof sessionStore.destroy === "function") {
      sessionStore.all((error, sessions) => {
        if (error) {
          console.error("Session lookup error:", error.message);
          return res.status(500).json({
            message: "Password changed, but session cleanup needs attention."
          });
        }

        const sessionIds = Object.keys(sessions || {}).filter(
          (id) => sessions[id].userId === user._id.toString()
        );

        let remaining = sessionIds.length;
        let failed = false;

        if (remaining === 0) {
          return res.json({
            message: "Password reset successfully. Please log in again."
          });
        }

        sessionIds.forEach((id) => {
          sessionStore.destroy(id, (destroyError) => {
            if (destroyError) failed = true;
            remaining -= 1;

            if (remaining === 0) {
              if (failed) {
                return res.status(500).json({
                  message: "Password changed, but some sessions could not be cleared."
                });
              }

              return res.json({
                message: "Password reset successfully. Please log in again."
              });
            }
          });
        });
      });
    } else {
      return res.json({
        message: "Password reset successfully. Please log in again."
      });
    }
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      message: "Could not reset password."
    });
  }
});


module.exports = router;

// Is file ka important logic
// 1. Register API email check karti hai, password hash banati hai aur user save karti hai.
// 2. Login API saved hash ke saath bcrypt.compare() karti hai.
// 3. Correct password par session regenerate karke user ID store hoti hai.
// 4. /me endpoint session verify karta hai; browser mein sirf dashboard khol lena authentication nahi hai.
// 5. Logout session destroy karta hai aur cookie clear karta hai.