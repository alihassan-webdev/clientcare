import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TicketProvider } from "@/contexts/TicketContext";
import { AppLayout } from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CreateTicket from "./pages/CreateTicket";
import TicketsList from "./pages/TicketsList";
import TicketDetail from "./pages/TicketDetail";
import AdminSettings from "./pages/AdminSettings";
import AdminReports from "./pages/AdminReports";
import ProfileSettings from "./pages/ProfileSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <TicketProvider>
            <Toaster />
            <Sonner />
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tickets" element={<TicketsList />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/create-ticket" element={<CreateTicket />} />
                <Route path="/profile" element={<ProfileSettings />} />
              </Route>
              <Route element={<ProtectedRoute requiredRole="admin"><AppLayout /></ProtectedRoute>}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin-settings" element={<AdminSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TicketProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
