
import mongoose from "mongoose";
import axios from "axios";

import FlashcardDeck from "../models/flashcard.model.js";
import StudyMaterial from "../models/studyMaterial.model.js";

import { extractTextFromFile } from "../services/textExtraction.service.js";
import { generateAIResponse } from "../services/ai.service.js";

// Parse Gemini JSON safely
const parseAIResponse = (response) => {
  let cleaned = response.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI returned invalid JSON.");
  }

  return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
};

// Validate and normalize generated cards
const normalizeCards = (cards) => {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("AI did not generate any flashcards.");
  }

  return cards.map((card, index) => {
    const question = String(card.question || "").trim();
    const answer = String(card.answer || "").trim();
    const explanation = String(card.explanation || "").trim();

    if (!question || !answer) {
      throw new Error(`Flashcard ${index + 1} is invalid.`);
    }

    return {
      question,
      answer,
      explanation,
      status: "new",
      reviewCount: 0,
    };
  });
};

// Generate cards using Gemini
const generateCards = async ({
  text,
  subject,
  topic,
  count,
}) => {
  const systemPrompt = `
You are an expert educational flashcard creator.

Create accurate, useful flashcards for students.

Rules:
1. Questions must test understanding, not just memorization.
2. Answers must be clear and concise.
3. Avoid duplicate questions.
4. Do not invent facts.
5. Return only valid JSON.
6. Generate exactly the requested number of cards.
`;

  const userPrompt = `
Create ${count} flashcards.

Subject: ${subject}
Topic: ${topic}

Study content:
${text}

Return this exact JSON structure:

{
  "cards": [
    {
      "question": "Question here",
      "answer": "Answer here",
      "explanation": "Short explanation here"
    }
  ]
}
`;

  const response = await generateAIResponse({
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });

  const parsed = parseAIResponse(response);

  return normalizeCards(parsed.cards);
};

// GENERATE FLASHCARDS FROM STUDY MATERIAL
export const generateFlashcardsFromMaterial = async (req, res) => {
  try {
    const { materialId, count = 10 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(materialId)) {
      return res.status(400).json({
        success: false,
        message: "Valid material ID is required.",
      });
    }

    const cardCount = Number(count);

    if (!Number.isInteger(cardCount) || cardCount < 5 || cardCount > 30) {
      return res.status(400).json({
        success: false,
        message: "Flashcard count must be between 5 and 30.",
      });
    }

    const material = await StudyMaterial.findOne({
      _id: materialId,
      uploadedBy: req.userId,
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found.",
      });
    }

    if (!material.fileUrl || !material.mimeType) {
      return res.status(400).json({
        success: false,
        message: "This material does not contain an uploaded file.",
      });
    }

    const response = await axios.get(material.fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 10 * 1024 * 1024,
    });

    const fileBuffer = Buffer.from(response.data);

    const extractedText = await extractTextFromFile(
      fileBuffer,
      material.mimeType,
      material.originalName
    );

    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({
        success: false,
        message: "Not enough readable text found in this material.",
      });
    }

    // Limit input to avoid excessively large Gemini requests
    const limitedText = extractedText.slice(0, 25000);

    const cards = await generateCards({
      text: limitedText,
      subject: material.subject,
      topic: material.title,
      count: cardCount,
    });

    const deck = await FlashcardDeck.create({
      title: `${material.title} - Flashcards`,
      subject: material.subject,
      topic: material.title,
      description: `AI-generated flashcards from ${material.title}`,
      sourceType: "study_material",
      sourceMaterial: material._id,
      cards,
      createdBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Flashcards generated successfully.",
      deck,
    });
  } catch (error) {
    console.error("Generate material flashcards error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate flashcards.",
    });
  }
};

// GENERATE FLASHCARDS FROM SUBJECT AND TOPIC
export const generateFlashcardsFromTopic = async (req, res) => {
  try {
    const {
      subject,
      topic,
      count = 10,
      difficulty = "medium",
    } = req.body;

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof topic !== "string" ||
      !topic.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject and topic are required.",
      });
    }

    const cardCount = Number(count);

    if (!Number.isInteger(cardCount) || cardCount < 5 || cardCount > 30) {
      return res.status(400).json({
        success: false,
        message: "Flashcard count must be between 5 and 30.",
      });
    }

    const allowedDifficulties = ["easy", "medium", "hard"];

    if (!allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty.",
      });
    }

    const cards = await generateCards({
      text: `Create educational flashcards about ${topic}. Difficulty: ${difficulty}.`,
      subject: subject.trim(),
      topic: topic.trim(),
      count: cardCount,
    });

    const deck = await FlashcardDeck.create({
      title: `${topic.trim()} - Flashcards`,
      subject: subject.trim(),
      topic: topic.trim(),
      description: `AI-generated ${difficulty} flashcards`,
      sourceType: "topic",
      cards,
      createdBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Flashcards generated successfully.",
      deck,
    });
  } catch (error) {
    console.error("Generate topic flashcards error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate flashcards.",
    });
  }
};

// GET ALL FLASHCARD DECKS
export const getFlashcardDecks = async (req, res) => {
  try {
    const decks = await FlashcardDeck.find({
      createdBy: req.userId,
    })
      .select("-cards.answer -cards.explanation")
      .sort({ createdAt: -1 });

    const formattedDecks = decks.map((deck) => {
      const totalCards = deck.cards.length;
      const knownCards = deck.cards.filter(
        (card) => card.status === "known"
      ).length;

      return {
        ...deck.toObject(),
        totalCards,
        knownCards,
        progress: totalCards
          ? Math.round((knownCards / totalCards) * 100)
          : 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedDecks.length,
      decks: formattedDecks,
    });
  } catch (error) {
    console.error("Get flashcard decks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch flashcard decks.",
    });
  }
};

// GET ONE DECK
export const getFlashcardDeckById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deck ID.",
      });
    }

    const deck = await FlashcardDeck.findOne({
      _id: id,
      createdBy: req.userId,
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Flashcard deck not found.",
      });
    }

    return res.status(200).json({
      success: true,
      deck,
    });
  } catch (error) {
    console.error("Get flashcard deck error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch flashcard deck.",
    });
  }
};

// UPDATE CARD STATUS
export const updateFlashcardStatus = async (req, res) => {
  try {
    const { deckId, cardId } = req.params;
    const { status } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(deckId) ||
      !mongoose.Types.ObjectId.isValid(cardId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid deck or card ID.",
      });
    }

    if (!["known", "needs_revision"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be known or needs_revision.",
      });
    }

    const deck = await FlashcardDeck.findOne({
      _id: deckId,
      createdBy: req.userId,
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Flashcard deck not found.",
      });
    }

    const card = deck.cards.id(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found.",
      });
    }

    card.status = status;
    card.reviewCount += 1;
    card.lastReviewedAt = new Date();

    // Basic spaced repetition scheduling
    const intervalDays =
      status === "known"
        ? Math.min(30, Math.pow(2, card.reviewCount - 1))
        : 1;

    card.nextReviewAt = new Date(
      Date.now() + intervalDays * 24 * 60 * 60 * 1000
    );

    await deck.save();

    return res.status(200).json({
      success: true,
      message: "Flashcard progress updated.",
      card,
    });
  } catch (error) {
    console.error("Update flashcard status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update flashcard.",
    });
  }
};

// DELETE DECK
export const deleteFlashcardDeck = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deck ID.",
      });
    }

    const deck = await FlashcardDeck.findOneAndDelete({
      _id: id,
      createdBy: req.userId,
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Flashcard deck not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Flashcard deck deleted successfully.",
    });
  } catch (error) {
    console.error("Delete flashcard deck error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete flashcard deck.",
    });
  }
};
