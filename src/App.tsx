import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Donate from "./pages/Donate";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import HelpChatbot from "@/components/HelpChatbot";
import AccountModerationOverlay from "@/components/AccountModerationOverlay";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Define dashboard-related routes where chatbot should appear
  const dashboardRoutes = ['/dashboard', '/donate', '/history', '/profile', '/help'];
  const isDashboardRoute = dashboardRoutes.some(route => location.pathname.startsWith(route));

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/help" element={<Help />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && <AccountModerationOverlay />}
      {user && isDashboardRoute && <HelpChatbot />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
