import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import DashboardLayout from "./components/layout/DashboardLayout";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Chat from "./pages/Chat";
import CalendarPage from "./pages/Calendar";
import MOMPage from "./pages/MOM";
import AdminUsers from "./pages/AdminUsers";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/mom" element={<MOMPage />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
