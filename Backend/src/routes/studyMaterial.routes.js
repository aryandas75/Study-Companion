import express from "express";
import { protect } from "../middlewares/auth.middleware.js";

import {
  createStudyMaterial,
  getStudyMaterials,
  getStudyMaterialById,
  updateStudyMaterial,
  deleteStudyMaterial,
  extractStudyMaterialText,
  serveStudyMaterialFile,
} from "../controllers/studyMaterial.controller.js";

import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create material with optional file upload
router.post("/", upload.single("file"), createStudyMaterial);

// Get all materials
router.get("/", getStudyMaterials);

// Extract text from an uploaded material
router.get("/:id/extract-text", extractStudyMaterialText);

// Open or download an uploaded file
router.get("/:id/file", serveStudyMaterialFile);

// Get a particular material
router.get("/:id", getStudyMaterialById);

// Update material
router.patch("/:id", updateStudyMaterial);

// Delete material
router.delete("/:id", deleteStudyMaterial);

export default router;