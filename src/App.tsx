import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import CustomerHome from "./pages/customer/CustomerHome";
import PostJob from "./pages/customer/PostJob";
import JobDetails from "./pages/customer/JobDetails";
import Chat from "./pages/customer/Chat";
import CustomerChats from "./pages/customer/CustomerChats";
import CustomerProfile from "./pages/customer/CustomerProfile";
import WorkerHome from "./pages/worker/WorkerHome";
import WorkerJobDetails from "./pages/worker/WorkerJobDetails";
import WorkerMyJobs from "./pages/worker/WorkerMyJobs";
import WorkerEarnings from "./pages/worker/WorkerEarnings";
import WorkerProfile from "./pages/worker/WorkerProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          {/* Customer Routes */}
          <Route path="/customer" element={<CustomerHome />} />
          <Route path="/customer/post-job" element={<PostJob />} />
          <Route path="/customer/job/:id" element={<JobDetails />} />
          <Route path="/customer/chats" element={<CustomerChats />} />
          <Route path="/customer/chat/:id" element={<Chat />} />
          <Route path="/customer/profile" element={<CustomerProfile />} />
          
          {/* Worker Routes */}
          <Route path="/worker" element={<WorkerHome />} />
          <Route path="/worker/job/:id" element={<WorkerJobDetails />} />
          <Route path="/worker/my-jobs" element={<WorkerMyJobs />} />
          <Route path="/worker/earnings" element={<WorkerEarnings />} />
          <Route path="/worker/profile" element={<WorkerProfile />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
