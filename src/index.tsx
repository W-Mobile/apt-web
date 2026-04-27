import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Startsida } from "./screens/Startsida";
import { BasketballClubs } from "./screens/BasketballClubs";
import { PrivacyPolicy } from "./screens/PrivacyPolicy";
import { AdminAuthProvider } from "./admin/auth/AdminAuthProvider";
import { AdminLogin } from "./admin/auth/AdminLogin";
import { ProtectedRoute } from "./admin/auth/ProtectedRoute";
import { AdminLayout } from "./admin/layout/AdminLayout";

// Lazy placeholders — will be replaced with real components in later tasks
function ExercisesPlaceholder() { return <p>Exercises — kommer snart</p>; }
function WorkoutsPlaceholder() { return <p>Workouts — kommer snart</p>; }
function ProgramsPlaceholder() { return <p>Program — kommer snart</p>; }

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
                  <Route path="exercises/*" element={<ExercisesPlaceholder />} />
                  <Route path="workouts/*" element={<WorkoutsPlaceholder />} />
                  <Route path="programs/*" element={<ProgramsPlaceholder />} />
                  <Route index element={<ExercisesPlaceholder />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          </AdminAuthProvider>
        } />
      </Routes>
    </Router>
  </StrictMode>,
);
