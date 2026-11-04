
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getMyFamily,
  setupFamily,
  regenerateInviteCode,
  getFamilyNutritionOverview,
  updateFamilyMemberRole,
  removeFamilyMember,
} = require("../controllers/familyController");

router.use(protect);

router.get("/me", getMyFamily);
router.post("/setup", setupFamily);
router.put("/invite-code", regenerateInviteCode);
router.get("/nutrition-overview", getFamilyNutritionOverview);
router.put("/members/:userId/role", updateFamilyMemberRole);
router.delete("/members/:userId",removeFamilyMember);

module.exports = router;
