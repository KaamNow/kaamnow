import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/marketplace", label: "Find Workers" },
    { to: "/whatsapp-demo", label: "WhatsApp Demo" },
  ];

  return (
    <nav
      data-testid="main-nav"
      className="sticky top-0 z-40 bg-[#fcfbf9]/90 backdrop-blur border-b border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#ff6b35] flex items-center justify-center text-white font-display text-lg">
            K
          </div>
          <span className="font-display text-xl tracking-tight">
            kaamnow<span className="text-[#ff6b35]">.com</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={`text-sm font-semibold transition ${
                loc.pathname === l.to
                  ? "text-[#3f37c9]"
                  : "text-gray-700 hover:text-[#3f37c9]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                data-testid="dashboard-link"
                className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-[#3f37c9]"
              >
                <User size={16} /> {user.name?.split(" ")[0]}
              </Link>
              <button
                data-testid="logout-btn"
                onClick={async () => {
                  await logout();
                  nav("/");
                }}
                className="btn-outline !py-2 !px-3 flex items-center gap-1.5"
              >
                <LogOut size={14} />
                <span className="text-sm">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login" className="btn-outline !py-2">
                Login
              </Link>
              <Link to="/signup" data-testid="nav-signup" className="btn-saffron !py-2">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
