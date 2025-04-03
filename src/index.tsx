import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Startsida } from "./screens/Startsida";
import { BasketballClubs } from "./screens/BasketballClubs";
import { PrivacyPolicy } from "./screens/PrivacyPolicy";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Startsida />} />
        <Route path="/basketball-clubs" element={<BasketballClubs />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      </Routes>
    </Router>
  </StrictMode>,
);