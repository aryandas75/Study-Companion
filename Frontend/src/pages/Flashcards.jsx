import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  getFlashcardDecks,
  getFlashcardDeckById,
  generateFlashcardsFromMaterial,
  generateFlashcardsFromTopic,
  updateFlashcardStatus,
  deleteFlashcardDeck,
} from "../services/flashcard.api";

const getDecks = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.decks)) return response.decks;
  if (Array.isArray(response?.flashcardDecks)) return response.flashcardDecks;
  if (Array.isArray(response?.data?.decks)) return response.data.decks;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getDeck = (response) =>
  response?.deck ||
  response?.flashcardDeck ||
  response?.data?.deck ||
  response?.data?.flashcardDeck ||
  response?.data ||
  response;

const statusGroups = [
  {
    key: "new",
    label: "New",
    description: "Cards you have not reviewed yet",
    color: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  },
  {
    key: "known",
    label: "Known",
    description: "Cards you have learned",
    color: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  },
  {
    key: "needs_revision",
    label: "Need Revision",
    description: "Cards to practise again",
    color: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  },
];

function Flashcards() {
  const [decks, setDecks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [generationMode, setGenerationMode] = useState("topic");
  const [materialId, setMaterialId] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingCardId, setUpdatingCardId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [deckResponse, materialResponse] = await Promise.all([
        getFlashcardDecks(),
        api("/study-materials"),
      ]);

      setDecks(getDecks(deckResponse));

      const materialList = Array.isArray(materialResponse)
        ? materialResponse
        : materialResponse?.materials ||
          materialResponse?.studyMaterials ||
          materialResponse?.data?.materials ||
          [];

      setMaterials(
        materialList.filter((material) =>
          [
            "application/pdf",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ].includes(material.mimeType)
        )
      );
    } catch (err) {
      setError(err.message || "Unable to load flashcards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDeck = async (deckId) => {
    setError("");
    setNotice("");

    try {
      const response = await getFlashcardDeckById(deckId);
      const deck = getDeck(response);

      setSelectedDeck(deck);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      setError(err.message || "Unable to open this deck.");
    }
  };

  const cards = selectedDeck?.cards || [];
  const currentCard = cards[currentIndex] || null;

  // Separate cards according to their current status.
  const groupedCards = useMemo(() => {
    const result = {
      new: [],
      known: [],
      needs_revision: [],
    };

    cards.forEach((card, index) => {
      const key = result[card.status] ? card.status : "new";

      result[key].push({
        card,
        index,
      });
    });

    return result;
  }, [cards]);

  const totalCards = decks.reduce(
    (sum, deck) => sum + (deck.totalCards ?? deck.cards?.length ?? 0),
    0
  );

  const totalKnown = decks.reduce(
    (sum, deck) => sum + (deck.knownCards || 0),
    0
  );

  const handleGenerate = async (event) => {
    event.preventDefault();

    setGenerating(true);
    setError("");
    setNotice("");

    try {
      let response;

      if (generationMode === "material") {
        if (!materialId) {
          throw new Error("Please select a study material.");
        }

        response = await generateFlashcardsFromMaterial(
          materialId,
          Number(count)
        );
      } else {
        if (!subject.trim() || !topic.trim()) {
          throw new Error("Please enter both subject and topic.");
        }

        response = await generateFlashcardsFromTopic(
          subject.trim(),
          topic.trim(),
          Number(count),
          difficulty
        );
      }

      const deck = getDeck(response);

      await loadData();

      if (deck?._id) {
        setSelectedDeck(deck);
        setCurrentIndex(0);
        setIsFlipped(false);
      }

      setNotice("Flashcard deck generated successfully.");
    } catch (err) {
      setError(err.message || "Unable to generate flashcards.");
    } finally {
      setGenerating(false);
    }
  };

  // Update status immediately in the UI, then persist it in MongoDB.
  const handleStatusUpdate = async (status) => {
    if (!selectedDeck || !currentCard || updatingCardId) return;

    const deckId = selectedDeck._id;
    const cardId = currentCard._id;

    const previousDeck = selectedDeck;

    const reviewedAt = new Date().toISOString();

    // Optimistic UI update.
    setSelectedDeck((previous) => ({
      ...previous,
      cards: previous.cards.map((card) =>
        card._id === cardId
          ? {
              ...card,
              status,
              reviewCount: (card.reviewCount || 0) + 1,
              lastReviewedAt: reviewedAt,
              nextReviewAt: new Date(
                Date.now() + 24 * 60 * 60 * 1000
              ).toISOString(),
            }
          : card
      ),
    }));

    setUpdatingCardId(cardId);
    setIsFlipped(false);

    try {
      // Save the status in the backend.
      await updateFlashcardStatus(deckId, cardId, status);

      setNotice(
        status === "known"
          ? "Card marked as Known."
          : "Card moved to Need Revision."
      );

      // Fetch the latest deck from MongoDB.
      const updatedResponse = await getFlashcardDeckById(deckId);
      const updatedDeck = getDeck(updatedResponse);

      if (updatedDeck?._id) {
        setSelectedDeck(updatedDeck);
      }

      // Refresh deck statistics.
      const listResponse = await getFlashcardDecks();
      setDecks(getDecks(listResponse));
    } catch (err) {
      // Restore previous state if the backend request fails.
      setSelectedDeck(previousDeck);

      setError(err.message || "Unable to update card status.");
    } finally {
      setUpdatingCardId("");
    }
  };

  const handleDeleteDeck = async (deckId) => {
    if (
      !window.confirm(
        "Delete this flashcard deck? This cannot be undone."
      )
    ) {
      return;
    }

    setError("");

    try {
      await deleteFlashcardDeck(deckId);

      if (selectedDeck?._id === deckId) {
        setSelectedDeck(null);
      }

      await loadData();

      setNotice("Flashcard deck deleted.");
    } catch (err) {
      setError(err.message || "Unable to delete this deck.");
    }
  };

  const selectCard = (index) => {
    setCurrentIndex(index);
    setIsFlipped(false);
  };

  const moveCard = (direction) => {
    if (!cards.length) return;

    setCurrentIndex(
      (index) => (index + direction + cards.length) % cards.length
    );

    setIsFlipped(false);
  };

  return (
    <div className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:py-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              AI Flashcards
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Generate, review, and remember what you learn.
            </p>
          </div>

          <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-2 text-sm text-fuchsia-300">
            🧠 Active recall
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {/* Statistics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Saved decks", decks.length, "📚"],
            ["Total flashcards", totalCards, "🗂️"],
            ["Known cards", totalKnown, "✅"],
          ].map(([label, value, icon]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{label}</span>
                <span className="text-xl">{icon}</span>
              </div>

              <p className="mt-3 text-3xl font-bold text-white">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Generate Flashcards */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
          <h2 className="text-xl font-semibold">
            Generate flashcards
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Create a deck from an uploaded file or a subject and topic.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGenerationMode("topic")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                generationMode === "topic"
                  ? "bg-fuchsia-500 text-white"
                  : "border border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              From a topic
            </button>

            <button
              type="button"
              onClick={() => setGenerationMode("material")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                generationMode === "material"
                  ? "bg-fuchsia-500 text-white"
                  : "border border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              From study material
            </button>
          </div>

          <form
            onSubmit={handleGenerate}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            {generationMode === "topic" ? (
              <>
                <label className="text-sm text-slate-300">
                  Subject

                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Control Systems"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Topic

                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Time response analysis"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Difficulty

                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
              </>
            ) : (
              <label className="text-sm text-slate-300 md:col-span-2">
                Select study material

                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white"
                >
                  <option value="">
                    Choose a PDF, TXT, or DOCX file
                  </option>

                  {materials.map((material) => (
                    <option key={material._id} value={material._id}>
                      {material.title}
                      {material.subject ? ` — ${material.subject}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="text-sm text-slate-300">
              Number of cards

              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white"
              >
                {[5, 10, 15, 20, 25, 30].map((number) => (
                  <option key={number} value={number}>
                    {number} cards
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                disabled={generating}
                className="w-full rounded-xl bg-fuchsia-500 px-5 py-3 font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating
                  ? "Generating..."
                  : "✨ Generate flashcards"}
              </button>
            </div>
          </form>
        </section>

        {/* Saved Decks */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              Your decks
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Open a deck to review and organise its cards.
            </p>
          </div>

          {loading ? (
            <p className="rounded-xl border border-white/10 p-6 text-slate-400">
              Loading decks...
            </p>
          ) : decks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-slate-400">
              No flashcard decks yet. Generate your first deck above.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => {
                const deckCount =
                  deck.totalCards ?? deck.cards?.length ?? 0;

                const known = deck.knownCards || 0;

                const percent = deckCount
                  ? Math.round((known / deckCount) * 100)
                  : 0;

                return (
                  <article
                    key={deck._id}
                    className={`rounded-2xl border p-5 transition ${
                      selectedDeck?._id === deck._id
                        ? "border-fuchsia-400/40 bg-fuchsia-400/[0.06]"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <h3 className="font-semibold">
                      {deck.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      {deck.subject} · {deck.topic}
                    </p>

                    <div className="mt-4 flex justify-between text-xs text-slate-400">
                      <span>{deckCount} cards</span>
                      <span>{percent}% known</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openDeck(deck._id)}
                        className="flex-1 rounded-lg bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/20"
                      >
                        Review deck
                      </button>

                      <button
                        onClick={() => handleDeleteDeck(deck._id)}
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-sm text-red-300 hover:bg-red-400/10"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Selected Deck */}
        {selectedDeck && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedDeck.title}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedDeck.subject} · {selectedDeck.topic}
                </p>
              </div>

              <button
                onClick={() => setSelectedDeck(null)}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Close deck
              </button>
            </div>

            {/* Status counts */}
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {statusGroups.map((group) => (
                <div
                  key={group.key}
                  className={`rounded-xl border p-4 ${group.color}`}
                >
                  <p className="text-sm font-semibold">
                    {group.label}
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {groupedCards[group.key].length}
                  </p>

                  <p className="mt-1 text-xs opacity-75">
                    {group.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Active Flashcard */}
            {currentCard ? (
              <div className="mx-auto max-w-3xl">
                <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
                  <span>
                    Card {currentIndex + 1} of {cards.length}
                  </span>

                  <span className="capitalize">
                    {(currentCard.status || "new").replace("_", " ")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped((value) => !value)}
                  className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-[#17132c] to-[#101a31] p-8 text-center transition hover:border-fuchsia-400/40"
                >
                  <span className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
                    {isFlipped ? "Answer" : "Question"} · click to flip
                  </span>

                  <span className="text-xl font-semibold leading-relaxed sm:text-2xl">
                    {isFlipped
                      ? currentCard.answer
                      : currentCard.question}
                  </span>

                  {isFlipped && currentCard.explanation && (
                    <span className="mt-5 text-sm leading-6 text-slate-400">
                      {currentCard.explanation}
                    </span>
                  )}
                </button>

                {/* Navigation */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={() => moveCard(-1)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
                  >
                    ← Previous
                  </button>

                  <button
                    onClick={() => setIsFlipped((value) => !value)}
                    className="rounded-xl border border-fuchsia-400/20 px-4 py-2 text-sm text-fuchsia-300 hover:bg-fuchsia-400/10"
                  >
                    {isFlipped ? "Show question" : "Reveal answer"}
                  </button>

                  <button
                    onClick={() => moveCard(1)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
                  >
                    Next →
                  </button>
                </div>

                {/* Status buttons */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    disabled={!!updatingCardId}
                    onClick={() => handleStatusUpdate("known")}
                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 font-semibold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
                  >
                    {updatingCardId
                      ? "Updating..."
                      : "✓ I know this"}
                  </button>

                  <button
                    disabled={!!updatingCardId}
                    onClick={() =>
                      handleStatusUpdate("needs_revision")
                    }
                    className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-5 py-3 font-semibold text-amber-300 hover:bg-amber-400/20 disabled:opacity-50"
                  >
                    {updatingCardId
                      ? "Updating..."
                      : "↻ Need Revision"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">
                This deck has no cards.
              </p>
            )}

            {/* Separate status sections */}
            <div className="mt-10 space-y-6">
              {statusGroups.map((group) => (
                <div key={group.key}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {group.label}
                    </h3>

                    <span className="text-sm text-slate-500">
                      {groupedCards[group.key].length} cards
                    </span>
                  </div>

                  {groupedCards[group.key].length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                      No cards in this section yet.
                    </p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {groupedCards[group.key].map(
                        ({ card, index }) => (
                          <button
                            key={card._id || index}
                            onClick={() => selectCard(index)}
                            className={`rounded-xl border p-4 text-left transition ${
                              currentIndex === index
                                ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                                : "border-white/10 bg-[#0b1020] hover:border-white/20"
                            }`}
                          >
                            <span className="text-xs text-slate-500">
                              Card {index + 1}
                            </span>

                            <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-200">
                              {card.question}
                            </p>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default Flashcards;