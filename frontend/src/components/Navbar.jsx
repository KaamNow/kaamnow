import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Briefcase } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  // Role-aware nav links
  const links = user?.role === "worker"
    ? [
        { to: "/worker/dashboard", label: "Dashboard" },
        { to: "/worker/job-feed", label: "Job Feed" },
        { to: "/whatsapp-demo", label: "WhatsApp Demo" },
      ]
    : [
        { to: "/", label: "Home" },
        { to: "/marketplace", label: "Find Workers" },
        { to: "/whatsapp-demo", label: "WhatsApp Demo" },
      ];

  const dashboardLink = user?.role === "worker" ? "/worker/dashboard" : "/dashboard";

  return (
    <nav
      data-testid="main-nav"
      className="sticky top-0 z-40 bg-[#fcfbf9]/90 backdrop-blur border-b border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex-1 flex items-center justify-between">
          <Link to="/" data-testid="logo-link" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#ff6b35] flex items-center justify-center text-white font-display text-lg shadow-sm">
              K
            </div>
            <span className="font-display text-xl tracking-tight hidden sm:inline">
              kaamnow<span className="text-[#ff6b35]">.com</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <Link to="/" className={`text-sm font-bold transition ${loc.pathname === "/" ? "text-[#3f37c9]" : "text-gray-600 hover:text-[#3f37c9]"}`}>
              Home
            </Link>
            <Link to="/marketplace" className={`text-sm font-bold transition ${loc.pathname === "/marketplace" ? "text-[#3f37c9]" : "text-gray-600 hover:text-[#3f37c9]"}`}>
              Find Workers
            </Link>
            <Link to="/worker/job-feed" className={`text-sm font-bold transition ${loc.pathname === "/worker/job-feed" ? "text-[#3f37c9]" : "text-gray-600 hover:text-[#3f37c9]"}`}>
              Find Work
            </Link>
            <Link to="/whatsapp-demo" className={`text-sm font-bold transition ${loc.pathname === "/whatsapp-demo" ? "text-[#3f37c9]" : "text-gray-600 hover:text-[#3f37c9]"}`}>
              WhatsApp Demo
            </Link>
            <a href="mailto:hello@kaamnow.com" className="text-sm font-bold text-gray-600 hover:text-[#3f37c9] transition">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={dashboardLink}
                  data-testid="dashboard-link"
                  className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-800 hover:text-[#3f37c9] transition"
                >
                  <User size={16} className="text-[#3f37c9]" /> {user.name?.split(" ")[0]}
                </Link>
                <button
                  data-testid="logout-btn"
                  onClick={async () => {
                    await logout();
                    nav("/");
                  }}
                  className="text-xs font-bold text-gray-500 hover:text-red-500 transition px-2 py-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-4">
                <Link 
                  to="/login" 
                  data-testid="nav-login" 
                  className="text-sm font-bold text-gray-600 hover:text-[#3f37c9] px-3 py-2 transition"
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  data-testid="nav-signup" 
                  className="btn-saffron !text-xs sm:!text-sm !py-2 sm:!px-6 shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Signup
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

