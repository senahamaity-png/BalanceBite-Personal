const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const Family = require("../models/Family");

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    secret,
    { expiresIn: "7d" }
  );
};

// Create a new family for a registering user
const createFamilyForUser = async (user) => {
  let family;
  let attempts = 0;

  while (!family && attempts < 5) {
    try {
      family = await Family.create({
        name: `${user.name}'s Family`,
        owners: [user._id],
        inviteCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      attempts++;
    }
  }

  if (!family) {
    throw new Error("Unable to generate a unique family invitation code.");
  }

  user.familyId = family._id;
  user.familyRole = "owner";
  await user.save();

  return family;
};

// REGISTER
const registerUser = async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    let family;

    if (inviteCode) {
      family = await Family.findOne({
        inviteCode: inviteCode.trim().toUpperCase(),
        isActive: true,
      });

      if (!family) {
        await User.findByIdAndDelete(user._id);

        return res.status(404).json({
          success: false,
          message: "Invalid invitation code.",
        });
      }

      user.familyId = family._id;
      user.familyRole = "member";
      await user.save();
    } else {
      family = await createFamilyForUser(user);
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Registration and family setup successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        familyId: user.familyId,
        familyRole: user.familyRole,
      },
      family: {
        id: family._id,
        name: family.name,
        inviteCode: family.inviteCode,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error during registration.",
    });
  }
};

// LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        familyId: user.familyId,
        familyRole: user.familyRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error during login.",
    });
  }
};

// GET LOGGED-IN USER PROFILE
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name email profile familyId familyRole"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      profile: user,
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile.",
    });
  }
};

// UPDATE LOGGED-IN USER HEIGHT
const updateMyProfile = async (req, res) => {
  try {
    const { height } = req.body;

    if (height === undefined || height === null || height === "") {
      return res.status(400).json({
        success: false,
        message: "Height is required in centimeters.",
      });
    }

    const heightCm = Number(height);

    if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 250) {
      return res.status(400).json({
        success: false,
        message: "Height must be between 50 and 250 centimeters.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.profile = user.profile || {};
    user.profile.height = heightCm;

    await user.save();

    return res.json({
      success: true,
      message: "Profile height updated successfully.",
      profile: {
        height: user.profile.height,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile.",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMyProfile,
  updateMyProfile,
};