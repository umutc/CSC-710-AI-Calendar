import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TodoProvider } from "./contexts/TodoContext";
import { useTheme } from "./hooks/useTheme";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";

function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      richColors
      closeButton
    />
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/CSC-710-AI-Calendar/">
      <AuthProvider>
        <ThemeProvider>
          <TodoProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
            <ThemedToaster />
          </TodoProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
