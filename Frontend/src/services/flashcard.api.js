import api from "./api";

export const getFlashcardDecks = () => {
  return api("/flashcards");
};

export const getFlashcardDeckById = (id) => {
  return api(`/flashcards/${id}`);
};

export const generateFlashcardsFromMaterial = (
  materialId,
  count
) => {
  return api("/flashcards/generate/material", {
    method: "POST",
    body: JSON.stringify({
      materialId,
      count,
    }),
  });
};

export const generateFlashcardsFromTopic = (
  subject,
  topic,
  count,
  difficulty
) => {
  return api("/flashcards/generate/topic", {
    method: "POST",
    body: JSON.stringify({
      subject,
      topic,
      count,
      difficulty,
    }),
  });
};

export const updateFlashcardStatus = (
  deckId,
  cardId,
  status
) => {
  return api(`/flashcards/${deckId}/cards/${cardId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const deleteFlashcardDeck = (id) => {
  return api(`/flashcards/${id}`, {
    method: "DELETE",
  });
};