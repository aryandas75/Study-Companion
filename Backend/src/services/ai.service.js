import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

console.log("Gemini API key loaded:", Boolean(apiKey));

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

  try {
    const config = {
      systemInstruction: systemPrompt || undefined,
      maxOutputTokens: 8000,
      temperature: 0.4,
    };

    if (jsonMode) {
      config.responseMimeType = "application/json";
    }

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
    throw error;
  }
};