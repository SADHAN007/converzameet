import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import FullPageLoader from "./components/ui/FullPageLoader";
import DashboardLayout from "./components/layout/DashboardLayout";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Chat from "./pages/Chat";
import Messages from "./pages/Messages";
import CalendarPage from "./pages/Calendar";
import MOMPage from "./pages/MOM";
import AdminUsers from "./pages/AdminUsers";
import Profile from "./pages/Profile";
import CallHistory from "./pages/CallHistory";
import Leads from "./pages/Leads";
import Tasks from "./pages/Tasks";
import CreateUser from "./pages/CreateUser";
import DigitalMarketing from "./pages/DigitalMarketing";
import GraphicsDesign from "./pages/GraphicsDesign";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<FullPageLoader />}>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/mom" element={<MOMPage />} />
                <Route path="/calls" element={<CallHistory />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/create-user" element={<CreateUser />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/digital-marketing" element={<DigitalMarketing />} />
                <Route path="/graphics-design" element={<GraphicsDesign />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
