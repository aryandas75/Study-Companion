import api from "./api";

export const startPomodoroSession = async (subject) => {
  return await api("/pomodoro/start", {
    method: "POST",
    body: JSON.stringify({ subject }),
  });
};

export const pausePomodoroSession = async (sessionId) => {
  return await api(`/pomodoro/${sessionId}/pause`, {
    method: "PATCH",
  });
};

export const resumePomodoroSession = async (sessionId) => {
  return await api(`/pomodoro/${sessionId}/resume`, {
    method: "PATCH",
  });
};

export const finishPomodoroSession = async (sessionId) => {
  return await api(`/pomodoro/${sessionId}/finish`, {
    method: "PATCH",
  });
};

export const getPomodoroSessions = async () => {
  return await api("/pomodoro");
};

// Delete a completed study session
export const deletePomodoroSession = async (sessionId) => {
  return await api(`/pomodoro/${sessionId}`, {
    method: "DELETE",
  });
};