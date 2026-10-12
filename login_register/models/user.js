const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);



// unique: true email ke liye unique database index banane mein help karta hai. Duplicate email ko API mein bhi handle karenge.

// select: false password hash ko normal queries se automatically return hone se rokta hai.


// timestamps: true user creation aur update time record karta hai.