import StudyMaterial from "../models/studyMaterial.model.js";
import { uploadStudyFile } from "../services/fileUpload.service.js";
import { extractTextFromFile } from "../services/textExtraction.service.js";
import axios from "axios";
// CREATE STUDY MATERIAL
export const createStudyMaterial = async (req, res) => {
  let uploadedFile = null;

  try {
    
    const { title, subject, description, materialType } = req.body;

    if (
      typeof title !== "string" ||
      title.trim().length < 2 ||
      title.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 2 and 150 characters",
      });
    }

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject is required and must not exceed 100 characters",
      });
    }

    if (
      description !== undefined &&
      (typeof description !== "string" || description.length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must not exceed 1000 characters",
      });
    }

    const allowedTypes = ["pdf", "document", "link", "other"];

    if (
      materialType !== undefined &&
      !allowedTypes.includes(materialType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid material type",
      });
    }

    // Upload the file if one was provided
    if (req.file) {
      uploadedFile = await uploadStudyFile(req.file);
    }

    const studyMaterial = await StudyMaterial.create({
      title: title.trim(),
      subject: subject.trim(),
      description: description?.trim() || "",
      materialType: materialType || "pdf",

      fileUrl: uploadedFile?.fileUrl || "",
      publicId: uploadedFile?.publicId || null,
      originalName: uploadedFile?.originalName || null,
      mimeType: uploadedFile?.mimeType || null,
      fileSize: uploadedFile?.size || null,

      uploadedBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Study material created successfully",
      studyMaterial,
    });
  } catch (error) {
    console.error("Create study material error:", error);

    // Remove the uploaded file if saving to MongoDB fails
    if (uploadedFile?.publicId) {
      try {
        const cloudinary = (
          await import("../config/cloudinary.js")
        ).default;

        await cloudinary.uploader.destroy(uploadedFile.publicId, {
          resource_type: "raw",
        });
      } catch (cleanupError) {
        console.error("Cloudinary cleanup error:", cleanupError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create study material",
    });
  }
};

// GET ALL STUDY MATERIALS OF LOGGED-IN USER
export const getStudyMaterials = async (req, res) => {
  try {
    const {
      search = "",
      subject,
      page = "1",
      limit = "10",
    } = req.query;

    const currentPage = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(currentPage) ||
      !Number.isInteger(pageSize) ||
      currentPage < 1 ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 50",
      });
    }

    if (
      typeof search !== "string" ||
      typeof subject !== "undefined" && typeof subject !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid search or subject parameter",
      });
    }

    const filter = {
      uploadedBy: req.userId,
    };

    if (search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
        { subject: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (subject?.trim()) {
      filter.subject = {
        $regex: subject.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const [materials, total] = await Promise.all([
      StudyMaterial.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),

      StudyMaterial.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      materials,
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get study materials error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch study materials",
    });
  }
};

// GET ONE STUDY MATERIAL
export const getStudyMaterialById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID",
      });
    }

    const material = await StudyMaterial.findOne({
      _id: id,
      uploadedBy: req.userId,
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found",
      });
    }

    return res.status(200).json({
      success: true,
      material,
    });
  } catch (error) {
    console.error("Get study material error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch study material",
    });
  }
};

// UPDATE STUDY MATERIAL
export const updateStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, description, materialType, fileUrl } = req.body;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID",
      });
    }

    const material = await StudyMaterial.findOne({
      _id: id,
      uploadedBy: req.userId,
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found",
      });
    }

    if (title !== undefined) material.title = title;
    if (subject !== undefined) material.subject = subject;
    if (description !== undefined) material.description = description;
    if (fileUrl !== undefined) material.fileUrl = fileUrl;

    if (materialType !== undefined) {
      const allowedTypes = ["pdf", "document", "image", "link", "other"];

      if (!allowedTypes.includes(materialType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid material type",
        });
      }

      material.materialType = materialType;
    }

    await material.save();

    return res.status(200).json({
      success: true,
      message: "Study material updated successfully",
      material,
    });
  } catch (error) {
    console.error("Update study material error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update study material",
    });
  }
};

// DELETE STUDY MATERIAL
export const deleteStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID",
      });
    }

    const material = await StudyMaterial.findOneAndDelete({
      _id: id,
      uploadedBy: req.userId,
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Study material deleted successfully",
    });
  } catch (error) {
    console.error("Delete study material error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete study material",
    });
  }
};
// EXTRACT TEXT FROM AN UPLOADED STUDY MATERIAL

export const extractStudyMaterialText = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate material ID
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID",
      });
    }

    // Find the material belonging to the logged-in user
    const material = await StudyMaterial.findOne({
      _id: id,
      uploadedBy: req.userId,
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found",
      });
    }

    if (!material.fileUrl) {
      return res.status(400).json({
        success: false,
        message: "This study material does not have an uploaded file",
      });
    }

    const supportedMimeTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!supportedMimeTypes.includes(material.mimeType)) {
      return res.status(400).json({
        success: false,
        message: "Only PDF, TXT, and DOCX files can be processed",
      });
    }

    // Download the file from Cloudinary
    const response = await axios.get(material.fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 10 * 1024 * 1024,
    });

    const fileBuffer = Buffer.from(response.data);

    // Extract the text
   const extractedText = await extractTextFromFile(
  fileBuffer,
  material.mimeType,
  material.originalName
);

    return res.status(200).json({
      success: true,
      message: "Text extracted successfully",
      materialId: material._id,
      title: material.title,
      subject: material.subject,
      characterCount: extractedText.length,
      extractedText,
    });
  } catch (error) {
    console.error("Extract study material text error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to extract text from study material",
    });
  }
};
// OPEN OR DOWNLOAD A STUDY MATERIAL FILE
export const serveStudyMaterialFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { download } = req.query;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID",
      });
    }

    const material = await StudyMaterial.findOne({
      _id: id,
      uploadedBy: req.userId,
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found",
      });
    }

    if (!material.fileUrl || !material.mimeType) {
      return res.status(404).json({
        success: false,
        message: "No uploaded file found",
      });
    }

    const supportedMimeTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!supportedMimeTypes.includes(material.mimeType)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type",
      });
    }

    const response = await axios.get(material.fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 10 * 1024 * 1024,
    });

    const fileBuffer = Buffer.from(response.data);
    const filename = (material.originalName || material.title || "study-material")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

    res.setHeader("Content-Type", material.mimeType);
    res.setHeader(
      "Content-Disposition",
      `${download === "true" ? "attachment" : "inline"}; filename="${filename}"`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(fileBuffer);
  } catch (error) {
    console.error("Serve study material file error:", error.message);

    return res.status(502).json({
      success: false,
      message: "Failed to retrieve study material file",
    });
  }
};