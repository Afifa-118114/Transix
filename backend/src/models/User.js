const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 6,
    },

    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    avatar: {
      type: String,
      default: "",
    },
    
    role: {
      type: String,
      enum: ["traveler", "operator", "admin"],
      default: "traveler"
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
