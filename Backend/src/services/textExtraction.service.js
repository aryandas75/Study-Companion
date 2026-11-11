
import mammoth from "mammoth";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export const extractTextFromFile = async (
  buffer,
  mimeType,
  originalName
) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid file buffer.");
  }

  const extension = originalName?.split(".").pop()?.toLowerCase();

  // PDF extraction
  if (mimeType === "application/pdf" || extension === "pdf") {
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl: `${process.cwd()}/node_modules/pdfjs-dist/standard_fonts/`,
    });

    const pdf = await loadingTask.promise;

    let extractedText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      extractedText += pageText + "\n";
    }

    return extractedText.trim();
  }

  // DOCX extraction
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  // TXT extraction
  if (mimeType === "text/plain" || extension === "txt") {
    return buffer.toString("utf-8").trim();
  }

  throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
};

