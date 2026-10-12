const express = require("express");
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

module.exports = router;

// Is file ka important logic
// 1. Register API email check karti hai, password hash banati hai aur user save karti hai.
// 2. Login API saved hash ke saath bcrypt.compare() karti hai.
// 3. Correct password par session regenerate karke user ID store hoti hai.
// 4. /me endpoint session verify karta hai; browser mein sirf dashboard khol lena authentication nahi hai.
// 5. Logout session destroy karta hai aur cookie clear karta hai.