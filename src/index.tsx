import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Startsida } from "./screens/Startsida";
import { BasketballClubs } from "./screens/BasketballClubs";
import { PrivacyPolicy } from "./screens/PrivacyPolicy";
import { AdminAuthProvider } from "./admin/auth/AdminAuthProvider";
import { AdminLogin } from "./admin/auth/AdminLogin";
import { ProtectedRoute } from "./admin/auth/ProtectedRoute";
import { AdminLayout } from "./admin/layout/AdminLayout";
import { ExerciseList } from "./admin/exercises/ExerciseList";
import { ExerciseForm } from "./admin/exercises/ExerciseForm";
import { WorkoutList } from "./admin/workouts/WorkoutList";
import { WorkoutForm } from "./admin/workouts/WorkoutForm";
import { ProgramList } from "./admin/programs/ProgramList";
import { ProgramForm } from "./admin/programs/ProgramForm";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Startsida />} />
        <Route path="/basketball-clubs" element={<BasketballClubs />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={
          <AdminAuthProvider>
            <AdminLogin />
          </AdminAuthProvider>
        } />
        <Route path="/admin/*" element={
          <AdminAuthProvider>
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route path="exercises" element={<ExerciseList />} />
                  <Route path="exercises/:id" element={<ExerciseForm />} />
                  <Route path="workouts" element={<WorkoutList />} />
                  <Route path="workouts/:id" element={<WorkoutForm />} />
                  <Route path="programs" element={<ProgramList />} />
                  <Route path="programs/:id" element={<ProgramForm />} />
                  <Route index element={<Navigate to="/admin/exercises" replace />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          </AdminAuthProvider>
        } />
      </Routes>
    </Router>
  </StrictMode>,
);
