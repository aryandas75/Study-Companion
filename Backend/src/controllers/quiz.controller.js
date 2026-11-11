import mongoose from "mongoose";

import Quiz from "../models/quiz.model.js";
import QuizAttempt from "../models/quizAttempt.model.js";
import StudyProgress from "../models/studyProgress.model.js";

import { generateAIResponse } from "../services/ai.service.js";

const VALID_ANSWERS = ["A", "B", "C", "D"];

// --------------------------------------------------
// HELPER 1: NORMALIZE ANSWER
// --------------------------------------------------

const normalizeAnswer = (answer, options) => {
  if (typeof answer !== "string") {
    return null;
  }

  const normalized = answer.trim();

  const letterMatch = normalized.match(
    /^(?:OPTION\s*)?([A-D])(?:[\).:]|\s|$)/i
  );

  if (letterMatch) {
    return letterMatch[1].toUpperCase();
  }

  const directMatch = VALID_ANSWERS.find(
    (letter) => letter === normalized.toUpperCase()
  );

  if (directMatch) {
    return directMatch;
  }

  const index = options.findIndex(
    (option) =>
      option.trim().toLowerCase() === normalized.toLowerCase()
  );

  return index === -1 ? null : VALID_ANSWERS[index];
};

// --------------------------------------------------
// HELPER 2: NORMALIZE OPTIONS
// --------------------------------------------------

const normalizeOptions = (options) => {
  if (Array.isArray(options)) {
    if (options.length !== 4) {
      return null;
    }

    const normalized = options.map((option) => {
      if (typeof option === "string") {
        return option.trim();
      }

      if (option && typeof option === "object") {
        return String(
          option.text ?? option.value ?? option.option ?? ""
        ).trim();
      }

      return "";
    });

    if (normalized.some((option) => !option)) {
      return null;
    }

    return normalized;
  }

  if (options && typeof options === "object") {
    const normalized = VALID_ANSWERS.map((key) => {
      const option = options[key];

      if (typeof option === "string") {
        return option.trim();
      }

      if (option && typeof option === "object") {
        return String(
          option.text ?? option.value ?? option.option ?? ""
        ).trim();
      }

      return "";
    });

    if (normalized.some((option) => !option)) {
      return null;
    }

    return normalized;
  }

  return null;
};

// --------------------------------------------------
// HELPER 3: NORMALIZE QUESTIONS
// --------------------------------------------------

const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("At least one question is required.");
  }

  return questions.map((question, index) => {
    if (
      !question ||
      typeof question.question !== "string" ||
      !question.question.trim()
    ) {
      throw new Error(`Question ${index + 1} is invalid.`);
    }

    const options = normalizeOptions(question.options);

    if (!options) {
      throw new Error(
        `Question ${index + 1} must contain four valid options.`
      );
    }

    // Reject duplicate options.
    const uniqueOptions = new Set(
      options.map((option) => option.toLowerCase())
    );

    if (uniqueOptions.size !== 4) {
      throw new Error(
        `Question ${index + 1} contains duplicate options.`
      );
    }

    const correctAnswer = normalizeAnswer(
      question.correctAnswer ??
        question.answer ??
        question.correctOption,
      options
    );

    if (!correctAnswer) {
      throw new Error(
        `Question ${index + 1} has an invalid correct answer.`
      );
    }

    return {
      question: question.question.trim(),
      options,
      correctAnswer,

      explanation:
        typeof question.explanation === "string"
          ? question.explanation.trim()
          : "",
    };
  });
};

// --------------------------------------------------
// HELPER 4: CLEAN AI JSON RESPONSE
// --------------------------------------------------

const parseAIResponse = (response) => {
  if (typeof response !== "string") {
    throw new Error("AI returned an invalid response format.");
  }

  let cleaned = response.trim();

  // Remove markdown code fences.
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Extract JSON object if additional text is present.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI did not return valid JSON.");
  }

  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  return JSON.parse(cleaned);
};

// --------------------------------------------------
// HELPER 5: GEMINI RETRY FOR TEMPORARY ERRORS
// --------------------------------------------------

const generateWithRetry = async (options) => {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateAIResponse(options);
    } catch (error) {
      const message = String(error.message || "").toLowerCase();

      const status = Number(error.status || error.statusCode);

      const temporaryError =
        [429, 500, 502, 503, 504].includes(status) ||
        message.includes("high demand") ||
        message.includes("temporarily unavailable");

      if (!temporaryError || attempt === maxRetries) {
        throw error;
      }

      const delay = 1500 * Math.pow(2, attempt);

      console.log(
        `Gemini temporarily unavailable. Retrying in ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("AI service is temporarily unavailable.");
};

// --------------------------------------------------
// HELPER 6: GENERATE VALID QUESTIONS
// --------------------------------------------------

const generateValidQuestions = async ({
  subject,
  topic,
  difficulty,
  numberOfQuestions,
}) => {
  let lastError;

  // If Gemini returns malformed questions, try generating again.
  const maxGenerationAttempts = 2;

  for (
    let attempt = 0;
    attempt < maxGenerationAttempts;
    attempt++
  ) {
    const systemPrompt = `
You are an expert educational MCQ question generator.

Your task is to generate accurate, original examination-level MCQs.

STRICT RULES:

1. Generate exactly ${numberOfQuestions} questions.
2. Every question MUST contain exactly four options.
3. Every option MUST be a non-empty string.
4. Options must be stored using keys A, B, C and D.
5. Exactly one option must be correct.
6. correctAnswer MUST be exactly one of: A, B, C, D.
7. Every question must have a meaningful explanation.
8. Never leave options empty or omit an option.
9. Never generate duplicate questions.
10. Return valid JSON only.
11. Do not include markdown or text outside JSON.

The required structure is:

{
  "questions": [
    {
      "question": "Question text",
      "options": {
        "A": "Option one",
        "B": "Option two",
        "C": "Option three",
        "D": "Option four"
      },
      "correctAnswer": "A",
      "explanation": "Explanation"
    }
  ]
}
`;

    const userPrompt = `
Generate exactly ${numberOfQuestions} MCQs.

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}

${attempt > 0
  ? `IMPORTANT: Your previous response was invalid. Error: ${lastError.message}. Regenerate every question carefully and ensure all four options are present and valid.`
  : ""
}

Return ONLY this JSON structure:

{
  "questions": [
    {
      "question": "Question text",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correctAnswer": "A",
      "explanation": "Explanation"
    }
  ]
}

Remember:
- Exactly ${numberOfQuestions} questions.
- Exactly four non-empty options per question.
- correctAnswer must be A, B, C or D.
`;

    const response = await generateWithRetry({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    try {
      const parsed = parseAIResponse(response);

      if (
        !Array.isArray(parsed.questions) ||
        parsed.questions.length !== numberOfQuestions
      ) {
        throw new Error(
          `AI must generate exactly ${numberOfQuestions} questions.`
        );
      }

      const normalizedQuestions = normalizeQuestions(
        parsed.questions
      );

      return normalizedQuestions;
    } catch (error) {
      lastError = error;

      console.error(
        `Invalid AI quiz response. Generation attempt ${attempt + 1}:`,
        error.message
      );
    }
  }

  throw new Error(
    `AI could not generate a valid quiz after ${maxGenerationAttempts} attempts. Last error: ${lastError?.message}`
  );
};

// --------------------------------------------------
// 1. CREATE MANUAL QUIZ
// --------------------------------------------------

export const createQuiz = async (req, res) => {
  try {
    const {
      title,
      subject = "General",
      topic,
      difficulty = "medium",
      questions,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof topic !== "string" ||
      !topic.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Quiz title and topic are required.",
      });
    }

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty.",
      });
    }

    const normalizedQuestions = normalizeQuestions(questions);

    const quiz = await Quiz.create({
      title: title.trim(),
      subject:
        typeof subject === "string" && subject.trim()
          ? subject.trim()
          : "General",
      topic: topic.trim(),
      difficulty,
      questions: normalizedQuestions,
      user: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Quiz created successfully.",
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        subject: quiz.subject,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        questionCount: quiz.questions.length,
      },
    });
  } catch (error) {
    console.error("Create quiz error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create quiz.",
    });
  }
};

// --------------------------------------------------
// 2. GENERATE AND SAVE AI QUIZ
// --------------------------------------------------

export const generateQuiz = async (req, res) => {
  try {
    const {
      title,
      subject,
      topic,
      difficulty = "medium",
      numberOfQuestions = 5,
    } = req.body;

    if (
      typeof topic !== "string" ||
      !topic.trim() ||
      topic.trim().length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid topic.",
      });
    }

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid subject.",
      });
    }

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty.",
      });
    }

    const questionCount = Number(numberOfQuestions);

    if (
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 20
    ) {
      return res.status(400).json({
        success: false,
        message: "Choose between 1 and 20 questions.",
      });
    }

    const normalizedQuestions = await generateValidQuestions({
      subject: subject.trim(),
      topic: topic.trim(),
      difficulty,
      numberOfQuestions: questionCount,
    });

    const quiz = await Quiz.create({
      title:
        typeof title === "string" && title.trim()
          ? title.trim()
          : `${subject.trim()} - ${topic.trim()} Quiz`,
      subject: subject.trim(),
      topic: topic.trim(),
      difficulty,
      questions: normalizedQuestions,
      user: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "AI quiz generated and saved successfully.",
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        subject: quiz.subject,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        questionCount: quiz.questions.length,
        createdAt: quiz.createdAt,
      },
    });
  } catch (error) {
    console.error("Generate quiz error:", error);

    const message = String(error.message || "").toLowerCase();

    const status = Number(error.status || error.statusCode);

    const isTemporaryError =
      [429, 500, 502, 503, 504].includes(status) ||
      message.includes("high demand") ||
      message.includes("temporarily unavailable");

    return res.status(isTemporaryError ? 503 : 502).json({
      success: false,
      message: isTemporaryError
        ? "Gemini is temporarily unavailable. Your quiz was not saved. Please try again later."
        : error.message || "Gemini returned an invalid quiz. Please try again.",
    });
  }
};

// --------------------------------------------------
// 3. GET ALL SAVED QUIZZES
// --------------------------------------------------

export const getQuizzes = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const quizzes = await Quiz.aggregate([
      {
        $match: {
          user: userId,
        },
      },
      {
        $project: {
          title: 1,
          subject: 1,
          topic: 1,
          difficulty: 1,
          createdAt: 1,
          questionCount: {
            $size: {
              $ifNull: ["$questions", []],
            },
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    const quizIds = quizzes.map((quiz) => quiz._id);

    const attemptStats = await QuizAttempt.aggregate([
      {
        $match: {
          user: userId,
          quiz: {
            $in: quizIds,
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$quiz",
          attempts: {
            $sum: 1,
          },
          bestScore: {
            $max: "$scorePercentage",
          },
          latestScore: {
            $first: "$scorePercentage",
          },
        },
      },
    ]);

    const statsMap = new Map(
      attemptStats.map((item) => [
        String(item._id),
        item,
      ])
    );

    const formattedQuizzes = quizzes.map((quiz) => {
      const stats = statsMap.get(String(quiz._id));

      return {
        ...quiz,
        attempts: stats?.attempts || 0,
        bestScore: stats?.bestScore || 0,
        latestScore: stats?.latestScore || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedQuizzes.length,
      quizzes: formattedQuizzes,
    });
  } catch (error) {
    console.error("Get quizzes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quizzes.",
    });
  }
};

// --------------------------------------------------
// 4. GET ONE QUIZ WITHOUT CORRECT ANSWERS
// --------------------------------------------------

export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID.",
      });
    }

    const quiz = await Quiz.findOne({
      _id: id,
      user: req.userId,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found.",
      });
    }

    const safeQuiz = {
      _id: quiz._id,
      title: quiz.title,
      subject: quiz.subject,
      topic: quiz.topic,
      difficulty: quiz.difficulty,

      questions: quiz.questions.map((question) => ({
        _id: question._id,
        question: question.question,
        options: question.options,
      })),
    };

    return res.status(200).json({
      success: true,
      quiz: safeQuiz,
    });
  } catch (error) {
    console.error("Get quiz error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quiz.",
    });
  }
};

// --------------------------------------------------
// 5. SUBMIT QUIZ AND SAVE ATTEMPT
// --------------------------------------------------

export const submitQuizAttempt = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      answers,
      timeTakenSeconds = 0,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID.",
      });
    }

    if (
      !Array.isArray(answers) ||
      !Number.isInteger(timeTakenSeconds) ||
      timeTakenSeconds < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz submission.",
      });
    }

    const quiz = await Quiz.findOne({
      _id: id,
      user: req.userId,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found.",
      });
    }

    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({
        success: false,
        message: "Submit an answer for every question.",
      });
    }

    const answerMap = new Map();

    for (const answer of answers) {
      if (
        !answer ||
        !mongoose.Types.ObjectId.isValid(answer.questionId) ||
        answerMap.has(String(answer.questionId))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or duplicate question answer.",
        });
      }

      const selectedAnswer =
        answer.selectedAnswer === null ||
        answer.selectedAnswer === undefined ||
        answer.selectedAnswer === ""
          ? null
          : String(answer.selectedAnswer).toUpperCase();

      if (
        selectedAnswer !== null &&
        !VALID_ANSWERS.includes(selectedAnswer)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid selected option.",
        });
      }

      answerMap.set(
        String(answer.questionId),
        selectedAnswer
      );
    }

    const results = [];

    let correctAnswers = 0;

    for (const question of quiz.questions) {
      const questionId = String(question._id);

      if (!answerMap.has(questionId)) {
        return res.status(400).json({
          success: false,
          message: "An answer is missing.",
        });
      }

      const selectedAnswer = answerMap.get(questionId);

      const isCorrect =
        selectedAnswer === question.correctAnswer;

      if (isCorrect) {
        correctAnswers++;
      }

      results.push({
        questionId: question._id,
        question: question.question,
        options: question.options,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      });
    }

    const totalQuestions = quiz.questions.length;

    const wrongAnswers = totalQuestions - correctAnswers;

    const scorePercentage = Math.round(
      (correctAnswers / totalQuestions) * 100
    );

    const attempt = await QuizAttempt.create({
      user: req.userId,
      quiz: quiz._id,
      quizTitle: quiz.title,
      subject: quiz.subject,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      scorePercentage,
      timeTakenSeconds,

      answers: results.map((result) => ({
        questionId: result.questionId,
        selectedAnswer: result.selectedAnswer,
        correctAnswer: result.correctAnswer,
        isCorrect: result.isCorrect,
      })),
    });

    try {
      await StudyProgress.create({
        user: req.userId,
        subject: quiz.subject || "General",
        topic: quiz.topic,
        studyTimeMinutes: 0,
        studyTimeSeconds: 0,
        quizzesAttempted: 1,
        correctAnswers,
        totalQuestions,
        scorePercentage,
        quizAttempt: attempt._id,
        date: new Date(),
      });
    } catch (progressError) {
      await QuizAttempt.deleteOne({
        _id: attempt._id,
        user: req.userId,
      });

      throw progressError;
    }

    return res.status(200).json({
      success: true,
      message: "Quiz submitted successfully.",

      result: {
        attemptId: attempt._id,
        title: quiz.title,
        subject: quiz.subject,
        topic: quiz.topic,
        correctAnswers,
        wrongAnswers,
        totalQuestions,
        scorePercentage,
        timeTakenSeconds,
        results,
        submittedAt: attempt.createdAt,
      },
    });
  } catch (error) {
    console.error("Submit quiz error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit quiz.",
    });
  }
};

// --------------------------------------------------
// 6. GET QUIZ ATTEMPT HISTORY
// --------------------------------------------------

export const getQuizAttempts = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      user: req.userId,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("quiz", "title")
      .lean();

    // Get IDs of quizzes that still exist.
    const quizIds = attempts
      .filter((attempt) => attempt.quiz?._id)
      .map((attempt) => attempt.quiz._id);

    // Fetch original questions and explanations.
    const quizzes = await Quiz.find({
      _id: { $in: quizIds },
      user: req.userId,
    })
      .select("questions")
      .lean();

    const quizMap = new Map(
      quizzes.map((quiz) => [
        String(quiz._id),
        quiz,
      ])
    );

    // Attach question details to each historical answer.
    const formattedAttempts = attempts.map((attempt) => {
      const quizId = attempt.quiz?._id;
      const originalQuiz = quizId
        ? quizMap.get(String(quizId))
        : null;

      const questionMap = new Map(
        (originalQuiz?.questions || []).map((question) => [
          String(question._id),
          question,
        ])
      );

      const reviewQuestions = (attempt.answers || []).map(
        (answer) => {
          const question = questionMap.get(
            String(answer.questionId)
          );

          return {
            questionId: answer.questionId,
            question: question?.question || "Original question unavailable.",
            options: question?.options || [],
            selectedAnswer: answer.selectedAnswer,
            correctAnswer: answer.correctAnswer,
            isCorrect: answer.isCorrect,
            explanation: question?.explanation || "",
          };
        }
      );

      return {
        ...attempt,
        reviewQuestions,
        canReview: reviewQuestions.some(
          (item) => item.options.length === 4
        ),
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedAttempts.length,
      attempts: formattedAttempts,
    });
  } catch (error) {
    console.error("Get quiz attempts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quiz attempts.",
    });
  }
};

// --------------------------------------------------
// 7. DELETE QUIZ
// --------------------------------------------------

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID.",
      });
    }

    const quiz = await Quiz.findOneAndDelete({
      _id: id,
      user: req.userId,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found.",
      });
    }

    await QuizAttempt.updateMany(
      {
        quiz: id,
        user: req.userId,
      },
      {
        $set: {
          quiz: null,
          quizTitle: quiz.title,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Quiz deleted successfully.",
    });
  } catch (error) {
    console.error("Delete quiz error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete quiz.",
    });
  }
};