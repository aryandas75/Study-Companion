import api from "./api";

export const getStudyGoals = async () => {
  return api("/study-goals");
};

export const updateStudyGoal = async (dailyGoalMinutes) => {
  return api("/study-goals", {
    method: "PUT",
    body: JSON.stringify({ dailyGoalMinutes }),
  });
};