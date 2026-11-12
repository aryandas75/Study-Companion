
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

console.log("Gemini API key loaded:", Boolean(apiKey));

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const MAX_ATTEMPTS = 3;
const INITIAL_DELAY = 1000;

// Check whether the error is temporary
const isRetryableError = (error) => {
  const status =
    error.status ||
    error.code ||
    error.error?.code;

  const message = (error.message || "").toLowerCase();

  // Temporary server errors
  if ([500, 503, 408].includes(Number(status))) {
    return true;
  }

  // Temporary network errors
  if (
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("network error") ||
    message.includes("fetch failed")
  ) {
    return true;
  }

  return false;
};

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const generateAIResponse = async ({
  systemPrompt,
  userPrompt,
  jsonMode = false,
}) => {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!userPrompt || !userPrompt.trim()) {
    throw new Error("User prompt is required");
  }

  const config = {
    systemInstruction: systemPrompt || undefined,
    maxOutputTokens: 8000,
    temperature: 0.4,
  };

  if (jsonMode) {
    config.responseMimeType = "application/json";
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `Gemini request: attempt ${attempt}/${MAX_ATTEMPTS}`
      );

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: userPrompt,
        config,
      });

      const answer = response.text?.trim();

      if (!answer) {
        throw new Error("Gemini returned an empty response");
      }

      return answer;
    } catch (error) {
      console.error("Gemini AI error:", error.message);

      const shouldRetry =
        isRetryableError(error) &&
        attempt < MAX_ATTEMPTS;

      if (!shouldRetry) {
        throw error;
      }

      // Exponential backoff: approximately 1s, then 2s
      const delay =
        INITIAL_DELAY * Math.pow(2, attempt - 1) +
        Math.random() * 500;

      console.log(
        `Gemini temporarily unavailable. Retrying in ${Math.round(delay)}ms...`
      );

      await wait(delay);
    }
  }

  throw new Error(
    "Gemini is temporarily unavailable. Please try again later."
  );
};
