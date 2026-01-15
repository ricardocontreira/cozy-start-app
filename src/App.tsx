import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ActiveRoleProvider } from "@/contexts/ActiveRoleContext";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PlannerAuth from "./pages/PlannerAuth";
import Landing from "./pages/Landing";
import HouseSetup from "./pages/HouseSetup";
import Dashboard from "./pages/Dashboard";
import Cards from "./pages/Cards";
import CardDetails from "./pages/CardDetails";
import CardInvoiceDetails from "./pages/CardInvoiceDetails";
import ExpenseDetails from "./pages/ExpenseDetails";
import IncomeDetails from "./pages/IncomeDetails";
import Planning from "./pages/Planning";
import GoalDetails from "./pages/GoalDetails";
import Settings from "./pages/Settings";
import PlannerOnboarding from "./pages/PlannerOnboarding";
import PlannerTeam from "./pages/PlannerTeam";
import PlannerDashboard from "./pages/PlannerDashboard";
import PlannerSettings from "./pages/PlannerSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <ActiveRoleProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/planner/auth" element={<PlannerAuth />} />
                <Route path="/house-setup" element={<HouseSetup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/cards" element={<Cards />} />
                <Route path="/cards/:cardId" element={<CardDetails />} />
                <Route path="/cards/:cardId/invoice/:month" element={<CardInvoiceDetails />} />
                <Route path="/expense-details" element={<ExpenseDetails />} />
                <Route path="/income-details" element={<IncomeDetails />} />
                <Route path="/planning" element={<Planning />} />
                <Route path="/goals/:goalId" element={<GoalDetails />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/planner-onboarding" element={<PlannerOnboarding />} />
                <Route path="/planner" element={<PlannerDashboard />} />
                <Route path="/planner/team" element={<PlannerTeam />} />
                <Route path="/planner/settings" element={<PlannerSettings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ActiveRoleProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
