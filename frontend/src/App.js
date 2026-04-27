import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Strategy from "@/pages/Strategy";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Marketplace from "@/pages/Marketplace";
import WorkerProfile from "@/pages/WorkerProfile";
import Dashboard from "@/pages/Dashboard";
import PostJob from "@/pages/PostJob";
import WhatsAppDemo from "@/pages/WhatsAppDemo";
import "@/App.css";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === undefined)
    return (
      <div className="p-12 text-center text-gray-500">Loading…</div>
    );
  if (!user) return <Navigate to="/login" replace />;
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
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
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
          <Route
            path="/whatsapp-demo"
            element={
              <Layout>
                <WhatsAppDemo />
              </Layout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
