import api from "./api";

export const getStudyAnalytics = async () => {
  try {
    const response = await api("/analytics");
    return response;
  } catch (error) {
    console.error("Error fetching study analytics:", error);
    throw error;
  }
};