import mongoose from "mongoose";

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    materialType: {
      type: String,
      enum: ["pdf", "document", "image", "link", "other"],
      default: "pdf",
    },

    fileUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Cloudinary file information
    publicId: {
      type: String,
      default: null,
    },

    originalName: {
      type: String,
      default: null,
    },

    mimeType: {
      type: String,
      default: null,
    },

    fileSize: {
      type: Number,
      default: null,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const StudyMaterial = mongoose.model(
  "StudyMaterial",
  studyMaterialSchema
);

export default StudyMaterial;