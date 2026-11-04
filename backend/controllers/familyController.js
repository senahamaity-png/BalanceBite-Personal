
const crypto = require("crypto");
const Family = require("../models/Family");
const User = require("../models/User");
const FoodLog = require("../models/FoodLog");
const NutritionGoal = require("../models/NutritionGoal");

const generateInviteCode = () =>
  crypto.randomBytes(4).toString("hex").toUpperCase();

const isFamilyOwner = (family, userId) =>
  family.owners.some((id) => id.toString() === userId.toString());

// Get logged-in user's family
exports.getMyFamily = async (req, res) => {
  try {
    if (!req.user.familyId) {
      return res.status(404).json({
        success: false,
        message: "You are not connected to a family.",
      });
    }

    const family = await Family.findById(req.user.familyId)
      .populate("owners", "name email");

    if (!family || !family.isActive) {
      return res.status(404).json({
        success: false,
        message: "Family not found or inactive.",
      });
    }

    const members = await User.find({
      familyId: family._id,
    }).select("name email familyRole profile.age profile.gender");

    return res.json({
      success: true,
      family,
      members,
    });
  } catch (error) {
    console.error("Get family error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load family.",
    });
  }
};

// Create a family or join using invitation code
exports.setupFamily = async (req, res) => {
  try {
    const { familyName, inviteCode } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.familyId) {
      return res.status(409).json({
        success: false,
        message: "You are already connected to a family.",
      });
    }

    // Join an existing family
    if (inviteCode) {
      const family = await Family.findOne({
        inviteCode: inviteCode.trim().toUpperCase(),
        isActive: true,
      });

      if (!family) {
        return res.status(404).json({
          success: false,
          message: "Invalid invitation code.",
        });
      }

      user.familyId = family._id;
      user.familyRole = "member";
      await user.save();

      return res.status(200).json({
        success: true,
        message: "You joined the family successfully.",
        family,
      });
    }

    // Create a new family
    const name = familyName?.trim() || `${user.name}'s Family`;

    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({
        success: false,
        message: "Family name must be between 2 and 60 characters.",
      });
    }

    let family;
    let attempts = 0;

    while (!family && attempts < 5) {
      try {
        family = await Family.create({
          name,
          owners: [user._id],
          inviteCode: generateInviteCode(),
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        attempts++;
      }
    }

    if (!family) {
      throw new Error("Could not generate a unique invitation code.");
    }

    user.familyId = family._id;
    user.familyRole = "owner";
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Family created successfully.",
      family,
    });
  } catch (error) {
    console.error("Family setup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create or join family.",
    });
  }
};

// Regenerate invitation code (any family owner)
exports.regenerateInviteCode = async (req, res) => {
  try {
    if (!req.user.familyId || req.user.familyRole !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only family owners can change the invitation code.",
      });
    }

    const family = await Family.findOne({
      _id: req.user.familyId,
      isActive: true,
    });

    if (!family || !isFamilyOwner(family, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not an owner of this family.",
      });
    }

    family.inviteCode = generateInviteCode();
    await family.save();

    return res.json({
      success: true,
      message: "Invitation code updated successfully.",
      inviteCode: family.inviteCode,
    });
  } catch (error) {
    console.error("Invite code error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update invitation code.",
    });
  }
};

// Family nutrition overview (any family owner)
exports.getFamilyNutritionOverview = async (req, res) => {
  try {
    const dateKey = req.query.date;

    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "Provide a date using YYYY-MM-DD format.",
      });
    }

    if (!req.user.familyId || req.user.familyRole !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only family owners can view nutrition progress.",
      });
    }

    const family = await Family.findOne({
      _id: req.user.familyId,
      isActive: true,
    });

    if (!family || !isFamilyOwner(family, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not an owner of this family.",
      });
    }

    const members = await User.find({
      familyId: family._id,
    }).select("name email familyRole");

    const nutritionFields = [
      "calories",
      "protein",
      "carbohydrates",
      "fat",
      "fiber",
    ];

    const memberProgress = await Promise.all(
      members.map(async (member) => {
        const [entries, goals] = await Promise.all([
          FoodLog.find({
            user: member._id,
            dateKey,
          }),
          NutritionGoal.findOne({
            user: member._id,
          }),
        ]);

        const totals = Object.fromEntries(
          nutritionFields.map((field) => [field, 0])
        );

        for (const entry of entries) {
          for (const field of nutritionFields) {
            totals[field] += Number(entry.nutrients?.[field] || 0);
          }
        }

        for (const field of nutritionFields) {
          totals[field] = Number(totals[field].toFixed(2));
        }

        const memberGoals = {
          calories: goals?.calories ?? 2000,
          protein: goals?.protein ?? 50,
          carbohydrates: goals?.carbohydrates ?? 275,
          fat: goals?.fat ?? 65,
          fiber: goals?.fiber ?? 28,
        };

        const progress = {};

        for (const field of nutritionFields) {
          progress[field] =
            memberGoals[field] > 0
              ? Number(
                  ((totals[field] / memberGoals[field]) * 100).toFixed(1)
                )
              : 0;
        }

        return {
          userId: member._id,
          name: member.name,
          email: member.email,
          familyRole: member.familyRole,
          entryCount: entries.length,
          totals,
          goals: memberGoals,
          progress,
        };
      })
    );

    return res.status(200).json({
      success: true,
      family: {
        id: family._id,
        name: family.name,
      },
      date: dateKey,
      members: memberProgress,
    });
  } catch (error) {
    console.error("Family nutrition overview error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load family nutrition overview.",
    });
  }
};

exports.updateFamilyMemberRole = async (req, res) => {
  return res.status(403).json({
    success: false,
    message:
      "Family roles are fixed. Owner permissions cannot be changed.",
  });
};
exports.removeFamilyMember = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
    }

    // Only family owners can remove members
    if (!req.user.familyId || req.user.familyRole !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only family owners can remove members.",
      });
    }

    const family = await Family.findById(req.user.familyId);

    if (!family || !family.isActive) {
      return res.status(404).json({
        success: false,
        message: "Family not found.",
      });
    }

    // Verify logged-in user is actually in owners array
    if (!isFamilyOwner(family, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not an owner of this family.",
      });
    }

    // Owner cannot remove themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself from the family.",
      });
    }

    // Find target user inside this family
    const targetUser = await User.findOne({
      _id: userId,
      familyId: family._id,
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Family member not found.",
      });
    }

    // Prevent removing another owner
    if (targetUser.familyRole === "owner") {
      return res.status(400).json({
        success: false,
        message: "Owners cannot be removed from the family.",
      });
    }

    // Disconnect user from family
    targetUser.familyId = null;
    targetUser.familyRole = "member";

    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "Family member removed successfully.",
      member: {
        id: targetUser._id,
        name: targetUser.name,
        familyRole: targetUser.familyRole,
      },
    });
  } catch (error) {
    console.error("Remove family member error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to remove family member.",
    });
  }
};