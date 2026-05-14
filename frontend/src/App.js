import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import KaamSaathi from "@/components/KaamSaathi";
import Landing from "@/pages/Landing";
import Strategy from "@/pages/Strategy";
import Login from "@/pages/Login";
import PhoneSignup from "@/pages/PhoneSignup";
import CustomerOnboarding from "@/pages/CustomerOnboarding";
import Marketplace from "@/pages/Marketplace";
import WorkerProfile from "@/pages/WorkerProfile";
import WorkerSetup from "@/pages/WorkerSetup";
import WorkerOnboarding from "@/pages/WorkerOnboarding";
import WorkerDashboard from "@/pages/WorkerDashboard";
import WorkerJobFeed from "@/pages/WorkerJobFeed";
import Dashboard from "@/pages/Dashboard";
import PostJob from "@/pages/PostJob";
import WhatsAppDemo from "@/pages/WhatsAppDemo";
import FindWork from "@/pages/FindWork";
import AdminDashboard from "@/pages/AdminDashboard";
import ContactSupport from "@/pages/ContactSupport";
import "@/App.css";

function Protected({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (user === undefined)
    return (
      <div className="p-12 text-center text-gray-500">Loading…</div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin" && !adminOnly) return <Navigate to="/admin" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <KaamSaathi />
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <Landing />
              </Layout>
            }
          />
          <Route
            path="/strategy"
            element={
              <Layout>
                <Strategy />
              </Layout>
            }
          />
          <Route
            path="/marketplace"
            element={
              <Layout>
                <Marketplace />
              </Layout>
            }
          />
          <Route
            path="/worker/:id"
            element={
              <Layout>
                <WorkerProfile />
              </Layout>
            }
          />
          {/* Legacy worker setup – kept for backwards compat */}
          <Route
            path="/worker/setup"
            element={
              <Protected>
                <WorkerSetup />
              </Protected>
            }
          />
          {/* New step-by-step onboarding */}
          <Route
            path="/worker/onboarding"
            element={
              <Protected>
                <WorkerOnboarding />
              </Protected>
            }
          />
          {/* Worker-specific dashboard */}
          <Route
            path="/worker/dashboard"
            element={
              <Protected>
                <Layout>
                  <WorkerDashboard />
                </Layout>
              </Protected>
            }
          />
          {/* Worker job feed */}
          <Route
            path="/worker/job-feed"
            element={
              <Protected>
                <Layout>
                  <WorkerJobFeed />
                </Layout>
              </Protected>
            }
          />
          <Route
            path="/find-work"
            element={
              <Layout>
                <FindWork />
              </Layout>
            }
          />
          <Route
            path="/whatsapp-demo"
            element={
              <Layout>
                <WhatsAppDemo />
              </Layout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<PhoneSignup />} />
          <Route
            path="/customer-onboarding"
            element={
              <Protected>
                <CustomerOnboarding />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Layout>
                  <Dashboard />
                </Layout>
              </Protected>
            }
          />
          <Route
            path="/post-job"
            element={
              <Protected>
                <Layout>
                  <PostJob />
                </Layout>
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected adminOnly>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </Protected>
            }
          />
          <Route
            path="/support"
            element={
              <Layout>
                <ContactSupport />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
