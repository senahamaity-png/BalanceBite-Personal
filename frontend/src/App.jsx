
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import FoodExplorer from "./pages/FoodExplorer";
import FoodDetails from "./pages/FoodDetails";
import FoodDiary from "./pages/FoodDiary";
import NutritionGoals from "./pages/NutritionGoals";
import MealPlanner from "./pages/MealPlanner";
import AdminDashboard from "./pages/AdminDashboard";
import FamilyManagement from "./pages/FamilyManagement";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("balancebite_personal_token");

  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/family"
          element={
            <ProtectedRoute>
              <FamilyManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/foods"
          element={
            <ProtectedRoute>
              <FoodExplorer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/foods/:id"
          element={
            <ProtectedRoute>
              <FoodDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diary"
          element={
            <ProtectedRoute>
              <FoodDiary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nutrition-goals"
          element={
            <ProtectedRoute>
              <NutritionGoals />
            </ProtectedRoute>
          }
        />

        <Route
          path="/meal-planner"
          element={
            <ProtectedRoute>
              <MealPlanner />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
