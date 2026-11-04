
import api from "./api";

// Fetch Admin Dashboard statistics
export const getAdminDashboard = async () => {
  const response = await api.get("/admin/dashboard");
  return response.data;
};
