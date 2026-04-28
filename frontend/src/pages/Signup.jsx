import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Signup() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
    village: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(form);
      toast.success(`Welcome to KaamNow, ${u.name}!`);
      nav(u.role === "worker" ? "/worker/onboarding" : "/marketplace");
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
        <div className="kn-card p-8" data-testid="signup-card">
          <h1 className="font-display text-3xl">Create your account</h1>
          <p className="text-gray-600 text-sm mt-1">Free forever for workers. ₹30 per booking for customers.</p>

          <div className="mt-5 grid grid-cols-2 gap-2" data-testid="signup-role-toggle">
            {[
              { v: "customer", l: "I need workers" },
              { v: "worker", l: "I am a worker" },
            ].map((r) => (
              <button
                key={r.v}
                type="button"
                onClick={() => setForm({ ...form, role: r.v })}
                data-testid={`role-${r.v}`}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                  form.role === r.v
                    ? "bg-[#3f37c9] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {r.l}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3" data-testid="signup-form">
            <input data-testid="signup-name" required placeholder="Full name" value={form.name} onChange={update("name")} className="kn-input" />
            <input data-testid="signup-email" required type="email" placeholder="Email" value={form.email} onChange={update("email")} className="kn-input" />
            <input data-testid="signup-password" required type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={update("password")} className="kn-input" />
            <input data-testid="signup-village" placeholder="Village (optional)" value={form.village} onChange={update("village")} className="kn-input" />
            <input data-testid="signup-phone" placeholder="Phone (optional)" value={form.phone} onChange={update("phone")} className="kn-input" />
            <button data-testid="signup-submit" disabled={loading} className="btn-saffron w-full disabled:opacity-60">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
          <div className="mt-5 text-sm text-gray-600 text-center">
            Already a member?{" "}
            <Link to="/login" data-testid="signup-to-login" className="text-[#3f37c9] font-bold">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
