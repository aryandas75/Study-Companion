import cloudinary from "../config/cloudinary.js";
import path from "path";

const allowedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const uploadStudyFile = async (file) => {
  if (!file) {
    throw new Error("Please select a file to upload");
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new Error("Only PDF, TXT, and DOCX files are allowed");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File size must not exceed 10 MB");
  }

  // Keep the original filename and extension.
  const originalName = path.basename(file.originalname);
  const extension = path.extname(originalName).toLowerCase();

  const allowedExtensions = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
  };

  if (extension !== allowedExtensions[file.mimetype]) {
    throw new Error("The file extension does not match its file type");
  }

  // Use a safe public ID while preserving the file extension.
  const safeBaseName = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);

  const publicId = `${Date.now()}-${safeBaseName}${extension}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
     {
  resource_type: "raw",
  folder: "study-companion/materials",
  public_id: publicId,
  use_filename: false,
  unique_filename: false,
  access_mode: "public",
},
      (error, result) => {
        if (error) {
          return reject(error);
        }
          console.log("Cloudinary upload result:", {
    public_id: result.public_id,
    secure_url: result.secure_url,
    format: result.format,
    resource_type: result.resource_type,
  });
        resolve({
          fileUrl: result.secure_url,
          publicId: result.public_id,
          originalName,
          mimeType: file.mimetype,
          size: file.size,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};