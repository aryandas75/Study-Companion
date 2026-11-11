import { GoogleGenAI } from "@google/genai";
import { generateAIResponse } from "../services/ai.service.js";
import StudyMaterial from "../models/studyMaterial.model.js";
import { extractTextFromFile } from "../services/textExtraction.service.js";
import axios from "axios";
import Chat from "../models/chat.model.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const aiGenerateJSON = async ({
  systemPrompt,
  userPrompt,
  schema,
}) => {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: schema,
      maxOutputTokens: 8000,
      temperature: 0.4,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty JSON response");
  }

  return response.text;
};
// SAVE AN AI RESULT TO CHAT HISTORY

const saveAIResult = async ({
  userId,
  chatId,
  title,
  prompt,
  result,
  tool,
}) => {
  let chat = null;

  if (chatId !== undefined && chatId !== null && chatId !== "") {
    if (
      typeof chatId !== "string" ||
      !/^[0-9a-fA-F]{24}$/.test(chatId)
    ) {
      const error = new Error("Invalid chat ID");
      error.statusCode = 400;
      throw error;
    }

    chat = await Chat.findOne({
      _id: chatId,
      userId,
    });

    if (!chat) {
      const error = new Error("Conversation not found");
      error.statusCode = 404;
      throw error;
    }
  } else {
    chat = new Chat({
      userId,
      title: title.slice(0, 60),
      messages: [],
    });
  }

  chat.messages.push(
    {
      role: "user",
      content: prompt,
      tool,
    },
    {
      role: "assistant",
      content: result,
      tool,
    }
  );

  await chat.save();

  return chat._id;
};

// ASK AI A QUESTION WITH FOLLOW-UP CONVERSATION SUPPORT

export const askAI = async (req, res) => {
  try {
    const {
      question,
      subject,
      history = [],
      text,
      chatId,
    } = req.body;

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a question",
      });
    }

    if (question.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Question cannot exceed 5000 characters",
      });
    }

    if (
      subject !== undefined &&
      (typeof subject !== "string" || subject.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject must be a string of at most 100 characters",
      });
    }

    if (
      text !== undefined &&
      (typeof text !== "string" || text.length > 12000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Study text must be a string of at most 12000 characters",
      });
    }

    if (
      !Array.isArray(history) ||
      history.length > 20 ||
      history.some(
        (message) =>
          !message ||
          !["user", "assistant"].includes(message.role) ||
          typeof message.content !== "string" ||
          message.content.length > 5000
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation history",
      });
    }

    let chat = null;

    if (chatId !== undefined && chatId !== null && chatId !== "") {
      if (
        typeof chatId !== "string" ||
        !/^[0-9a-fA-F]{24}$/.test(chatId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid chat ID",
        });
      }

      chat = await Chat.findOne({
        _id: chatId,
        userId: req.userId,
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }
    }

    const systemPrompt = `
You are Study Companion, an educational AI assistant.
Explain concepts accurately using simple language.
Break difficult concepts into logical steps.
Include examples when useful.
Use Markdown headings, bullet points, and numbered lists.
Answer follow-up questions using previous conversation context.
Do not repeat the entire previous answer unless requested.
If uncertain, say so honestly.
`;

    const conversation = history
      .slice(-10)
      .map((message) => {
        const role =
          message.role === "assistant" ? "AI" : "Student";

        return `${role}: ${message.content}`;
      })
      .join("\n\n");

    const userPrompt = `
${subject?.trim() ? `Subject: ${subject.trim()}\n` : ""}
${text?.trim() ? `Study material:\n${text.trim()}\n` : ""}
${conversation ? `Previous conversation:\n${conversation}\n\n` : ""}
Latest student question:

${question.trim()}

Answer the latest question using the previous conversation when relevant.
`;

    const answer = await generateAIResponse({
      systemPrompt,
      userPrompt,
    });

    if (!chat) {
      chat = new Chat({
        userId: req.userId,
        title: question.trim().slice(0, 60),
        messages: [],
      });
    } else if (chat.title === "New conversation") {
      chat.title = question.trim().slice(0, 60);
    }

    chat.messages.push(
      {
        role: "user",
        content: question.trim(),
        tool: "ask",
      },
      {
        role: "assistant",
        content: answer,
        tool: "ask",
      }
    );

    await chat.save();

    return res.status(200).json({
      success: true,
      question: question.trim(),
      answer,
      chatId: chat._id,
    });
  } catch (error) {
    console.error("Ask AI error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to generate an AI answer",
    });
  }
};

// SUMMARIZE STUDY MATERIAL

export const summarizeText = async (req, res) => {
  try {
    const {
      text,
      length = "medium",
      chatId,
    } = req.body;

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide text to summarize",
      });
    }

    if (text.length > 20000) {
      return res.status(400).json({
        success: false,
        message: "Text cannot exceed 20000 characters",
      });
    }

    if (!["short", "medium", "detailed"].includes(length)) {
      return res.status(400).json({
        success: false,
        message: "Length must be short, medium, or detailed",
      });
    }

    const systemPrompt = `
You are an educational summarization assistant.
Summarize the supplied study material accurately.
Preserve important definitions, formulas, concepts, and facts.
Do not invent information that is absent from the source.
Organize the summary with headings and bullet points when useful.
`;

    const userPrompt = `
Create a ${length} summary of the following study material.

Study material:

${text.trim()}
`;

    const summary = await generateAIResponse({
      systemPrompt,
      userPrompt,
    });

    const savedChatId = await saveAIResult({
      userId: req.userId,
      chatId,
      title: `Summary: ${text.trim().slice(0, 45)}`,
      prompt: `Summarize this study material (${length}):\n${text.trim()}`,
      result: summary,
      tool: "summarize",
    });

    return res.status(200).json({
      success: true,
      summary,
      chatId: savedChatId,
    });
  } catch (error) {
    console.error("Summarize text error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to summarize study material",
    });
  }
};

// GENERATE PRACTICE QUESTIONS
// GENERATE PRACTICE QUESTIONS
export const generateQuestions = async (req, res) => {
  try {
    const {
      topic,
      subject,
      difficulty = "medium",
      numberOfQuestions = 5,
      chatId,
      previousQuestions = [],
    } = req.body;

    // Validate topic
    if (
      typeof topic !== "string" ||
      !topic.trim() ||
      topic.trim().length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a topic of at most 300 characters",
      });
    }

    // Validate subject
    if (
      subject !== undefined &&
      (typeof subject !== "string" || subject.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject must be a string of at most 100 characters",
      });
    }

    // Validate difficulty
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "Difficulty must be easy, medium, or hard",
      });
    }

    // Validate question count
    if (
      !Number.isInteger(numberOfQuestions) ||
      numberOfQuestions < 1 ||
      numberOfQuestions > 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Number of questions must be between 1 and 10",
      });
    }

    // Validate previous questions
    if (
      !Array.isArray(previousQuestions) ||
      previousQuestions.length > 100 ||
      previousQuestions.some(
        (q) => typeof q !== "string" || q.length > 1000
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid previous questions",
      });
    }

    const systemPrompt = `
You are an expert educational exam-question generator.

Generate accurate, original, high-quality examination questions.

Rules:
- Follow the requested difficulty strictly.
- Never repeat a previously generated question.
- Generate conceptually different questions, not just reworded versions.
- Every question must have four options.
- Exactly one option must be correct.
- Provide a correct answer and meaningful explanation.
- Return valid JSON only.
- Do not include markdown code fences.
`;

    const schema = {
      type: "OBJECT",
      properties: {
        questions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: {
                type: "STRING",
              },
              options: {
                type: "OBJECT",
                properties: {
                  A: { type: "STRING" },
                  B: { type: "STRING" },
                  C: { type: "STRING" },
                  D: { type: "STRING" },
                },
                required: ["A", "B", "C", "D"],
              },
              correctAnswer: {
                type: "STRING",
                enum: ["A", "B", "C", "D"],
              },
              explanation: {
                type: "STRING",
              },
            },
            required: [
              "question",
              "options",
              "correctAnswer",
              "explanation",
            ],
          },
        },
      },
      required: ["questions"],
    };

    const subjectName = subject?.trim() || "General";

    // Normalize question text for duplicate checking.
    const normalizeQuestion = (value) =>
      value
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const previousSet = new Set(
      previousQuestions.map(normalizeQuestion)
    );

    const generateBatch = async (count, excludedQuestions = []) => {
      const previousText = excludedQuestions.length
        ? excludedQuestions
            .map((q, index) => `${index + 1}. ${q}`)
            .join("\n")
        : "None";

      const userPrompt = `
Generate EXACTLY ${count} NEW practice questions.

Subject: ${subjectName}
Topic: ${topic.trim()}
Difficulty: ${difficulty}

Previously generated questions. DO NOT REPEAT THESE OR CREATE SIMILAR QUESTIONS:

${previousText}

Requirements:
1. Generate exactly ${count} questions.
2. Every question must test a different concept or application.
3. Do not rephrase previous questions.
4. Each question must have four options: A, B, C, D.
5. Include exactly one correct answer.
6. Include a clear explanation.
7. Return all questions in the required JSON structure.
`;

      const response = await aiGenerateJSON({
        systemPrompt,
        userPrompt,
        schema,
      });

      const parsed = JSON.parse(response);

      if (!Array.isArray(parsed.questions)) {
        throw new Error("Invalid question response from Gemini");
      }

      return parsed.questions.filter((q) => {
        if (
          typeof q.question !== "string" ||
          !q.question.trim() ||
          !q.options?.A ||
          !q.options?.B ||
          !q.options?.C ||
          !q.options?.D ||
          !["A", "B", "C", "D"].includes(q.correctAnswer) ||
          typeof q.explanation !== "string" ||
          !q.explanation.trim()
        ) {
          return false;
        }

        const normalized = normalizeQuestion(q.question);

        if (previousSet.has(normalized)) {
          return false;
        }

        previousSet.add(normalized);
        return true;
      });
    };

    // Start with previously generated questions.
    const excludedQuestions = [...previousQuestions];

    let questions = [];
    let attempts = 0;

    // Generate questions and retry if Gemini returns duplicates or too few.
    while (
      questions.length < numberOfQuestions &&
      attempts < 4
    ) {
      const missing = numberOfQuestions - questions.length;

      console.log(
        `Generating ${missing} questions. Attempt ${attempts + 1}`
      );

      const additionalQuestions = await generateBatch(
        missing,
        excludedQuestions
      );

      questions.push(...additionalQuestions);

      excludedQuestions.push(
        ...additionalQuestions.map((q) => q.question)
      );

      attempts++;
    }

    if (questions.length !== numberOfQuestions) {
      return res.status(502).json({
        success: false,
        message: `AI generated only ${questions.length} of ${numberOfQuestions} new questions. Please try again.`,
      });
    }

    // Format questions for chat history.
    const formattedQuestions = questions
      .map(
        (q, index) => `
## Question ${index + 1}

${q.question}

A) ${q.options.A}
B) ${q.options.B}
C) ${q.options.C}
D) ${q.options.D}

**Correct Answer:** ${q.correctAnswer}

**Explanation:** ${q.explanation}
`
      )
      .join("\n");

    // Save this set in the conversation.
    const savedChatId = await saveAIResult({
      userId: req.userId,
      chatId,
      title: `Practice: ${topic.trim().slice(0, 45)}`,
      prompt: `Generate ${numberOfQuestions} ${difficulty} NEW practice questions about ${topic.trim()}.`,
      result: formattedQuestions,
      tool: "questions",
    });

    return res.status(200).json({
      success: true,
      topic: topic.trim(),
      difficulty,
      requestedCount: numberOfQuestions,
      generatedCount: questions.length,
      questions: formattedQuestions,
      questionItems: questions,
      chatId: savedChatId,
    });
  } catch (error) {
    console.error("Generate questions error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to generate practice questions",
    });
  }
};

// SUMMARIZE AN UPLOADED STUDY MATERIAL

export const summarizeStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { length = "medium", chatId } = req.body ?? {};

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID",
      });
    }

    if (!["short", "medium", "detailed"].includes(length)) {
      return res.status(400).json({
        success: false,
        message: "Length must be short, medium, or detailed",
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
      return res.status(400).json({
        success: false,
        message: "This material does not contain a supported uploaded file",
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
        message: "Only PDF, TXT, and DOCX files are supported",
      });
    }

    const response = await axios.get(material.fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 10 * 1024 * 1024,
    });

    const fileBuffer = Buffer.from(response.data);

    const text = await extractTextFromFile(
  fileBuffer,
  material.mimeType,
  material.originalName
);
    

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "No readable text was found in this file",
      });
    }

    const limitedText = text.slice(0, 12000);

    const systemPrompt = `
You are Study Companion, an educational AI assistant.
Summarize the supplied study material accurately.
Preserve important definitions, formulas, concepts, and facts.
Do not invent information that is absent from the source.
Use clear headings, bullet points, and simple explanations.
Mention if the supplied material appears incomplete.
`;

    const userPrompt = `
Create a ${length} summary of this study material.

Title: ${material.title}
Subject: ${material.subject}

Study material:

${limitedText}
`;

    const summary = await generateAIResponse({
      systemPrompt,
      userPrompt,
    });

    const savedChatId = await saveAIResult({
      userId: req.userId,
      chatId,
      title: `Summary: ${material.title}`,
      prompt: `Summarize uploaded material "${material.title}" (${length}).`,
      result: summary,
      tool: "summarize",
    });

    return res.status(200).json({
      success: true,
      message: "Study material summarized successfully",
      materialId: material._id,
      title: material.title,
      subject: material.subject,
      summary,
      chatId: savedChatId,
      truncated: text.length > limitedText.length,
    });
  } catch (error) {
    console.error("Summarize uploaded material error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to summarize uploaded study material",
    });
  }
};
