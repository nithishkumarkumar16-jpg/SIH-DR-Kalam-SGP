const express = require("express");
const { Scheme, College, SchemeRule } = require("../models");

const router = express.Router();

// GET /api/common/schemes (Public list of active schemes)
router.get("/schemes", async (req, res) => {
  try {
    const list = await Scheme.find({ active: true }).sort({ schemeName: 1 }).lean();
    res.json({ schemes: list });
  } catch (err) {
    res.status(500).json({ error: "Failed to load public schemes." });
  }
});

// GET /api/common/colleges (Public list of active colleges for dropdowns)
router.get("/colleges", async (req, res) => {
  try {
    const list = await College.find({ status: "ACTIVE" }).select("collegeId collegeName district state institutionType").sort({ collegeName: 1 }).lean();
    res.json({ colleges: list });
  } catch (err) {
    res.status(500).json({ error: "Failed to load colleges." });
  }
});

module.exports = router;
