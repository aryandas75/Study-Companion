import multer from "multer";

const allowedMimeTypes = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only PDF, TXT, and DOCX files are allowed")
      );
    }

    callback(null, true);
  },
});

export default upload;