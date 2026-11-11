import api from "./api";

const BASE_URL = "/study-tasks";

// Get all study tasks with optional filters
export const getTasks = (params = {}) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, value);
    }
  });

  const query = queryParams.toString();

  return api(`${BASE_URL}${query ? `?${query}` : ""}`);
};

// Create a new study task
export const createTask = (data) =>
  api(BASE_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });

// Update an existing study task
export const updateTask = (id, data) =>
  api(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// Delete an existing study task
export const deleteTask = (id) =>
  api(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

// Get task statistics
export const getTaskStats = () =>
  api(`${BASE_URL}/stats`);

// Get today's tasks
export const getTodayTasks = () =>
  api(`${BASE_URL}/today`);

// Get upcoming tasks
export const getUpcomingTasks = () =>
  api(`${BASE_URL}/upcoming`);

// Get overdue tasks
export const getOverdueTasks = () =>
  api(`${BASE_URL}/overdue`);