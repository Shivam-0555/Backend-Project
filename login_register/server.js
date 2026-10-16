require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const authRoutes = require("./routes/auth");
const MongoStore = require("connect-mongo").MongoStore;
const app = express();
const PORT = process.env.PORT || 5000;

// Check environment variables
if (!process.env.MONGO_URI || !process.env.SESSION_SECRET) {
  throw new Error("MONGO_URI and SESSION_SECRET are required.");
}

// store: MongoStore.create({
//   mongoUrl: process.env.MONGO_URI,
//   collectionName: "sessions",
//   ttl: 14 * 24 * 60 * 60,
// }),

// Basic security
app.disable("x-powered-by");

// Parse incoming requests
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));

// Trust proxy only in production (HTTPS deployment)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Session configuration
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60,
    }),

    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60,
    },
  })
);

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Authentication routes
app.use("/api/auth", authRoutes);

// Home page
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// Start server after connecting to MongoDB
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
