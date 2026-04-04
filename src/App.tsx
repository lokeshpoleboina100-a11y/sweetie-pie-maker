import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/components/NotificationProvider";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import CustomerHome from "./pages/customer/CustomerHome";
import PostJob from "./pages/customer/PostJob";
import JobDetails from "./pages/customer/JobDetails";
import Payment from "./pages/customer/Payment";
import Chat from "./pages/customer/Chat";
import CustomerChats from "./pages/customer/CustomerChats";
import CustomerProfile from "./pages/customer/CustomerProfile";
import WorkerHome from "./pages/worker/WorkerHome";
import WorkerJobDetails from "./pages/worker/WorkerJobDetails";
import WorkerMyJobs from "./pages/worker/WorkerMyJobs";
import WorkerEarnings from "./pages/worker/WorkerEarnings";
import WorkerProfile from "./pages/worker/WorkerProfile";
import WorkerSettings from "./pages/worker/WorkerSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EditProfile from "./pages/EditProfile";
import AIHelpDesk from "./pages/AIHelpDesk";
import PhoneLogin from "./pages/PhoneLogin";
import Stories from "./pages/Stories";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/phone-login" element={<PhoneLogin />} />
    
    {/* Customer Routes */}
    <Route path="/customer" element={<ProtectedRoute><CustomerHome /></ProtectedRoute>} />
    <Route path="/customer/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
    <Route path="/customer/job/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
    <Route path="/customer/payment/:id" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
    <Route path="/customer/chats" element={<ProtectedRoute><CustomerChats /></ProtectedRoute>} />
    <Route path="/customer/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
    <Route path="/customer/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
    
    {/* Worker Routes */}
    <Route path="/worker" element={<ProtectedRoute><WorkerHome /></ProtectedRoute>} />
    <Route path="/worker/job/:id" element={<ProtectedRoute><WorkerJobDetails /></ProtectedRoute>} />
    <Route path="/worker/my-jobs" element={<ProtectedRoute><WorkerMyJobs /></ProtectedRoute>} />
    <Route path="/worker/earnings" element={<ProtectedRoute><WorkerEarnings /></ProtectedRoute>} />
    <Route path="/worker/profile" element={<ProtectedRoute><WorkerProfile /></ProtectedRoute>} />
    <Route path="/worker/settings" element={<ProtectedRoute><WorkerSettings /></ProtectedRoute>} />
    
    {/* Shared Routes */}
    <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
    <Route path="/ai-help" element={<ProtectedRoute><AIHelpDesk /></ProtectedRoute>} />
    <Route path="/stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
    
    {/* Admin Routes */}
    <Route path="/admin/*" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
