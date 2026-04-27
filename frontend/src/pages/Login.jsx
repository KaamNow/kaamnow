import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      nav("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8 font-display text-2xl">
          kaamnow<span className="text-[#ff6b35]">.com</span>
        </Link>
        <div className="kn-card p-8" data-testid="login-card">
          <h1 className="font-display text-3xl">Welcome back</h1>
          <p className="text-gray-600 text-sm mt-1">Log in to manage workers, jobs and bookings.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" data-testid="login-form">
            <input
              data-testid="login-email"
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="kn-input"
            />
            <input
              data-testid="login-password"
              required
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="kn-input"
            />
            <button data-testid="login-submit" disabled={loading} className="btn-saffron w-full disabled:opacity-60">
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
          <div className="mt-5 text-sm text-gray-600 text-center">
            New to KaamNow?{" "}
            <Link to="/signup" data-testid="login-to-signup" className="text-[#3f37c9] font-bold">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
