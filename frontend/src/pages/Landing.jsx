import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, MapPin, MessageCircle, Star, Users, Briefcase, Zap } from "lucide-react";

export default function Landing() {
  const [stats, setStats] = useState({ workers: 0, jobs: 0, completed_bookings: 0, villages: 0 });
  const [featuredWorkers, setFeaturedWorkers] = useState([]);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [waitEmail, setWaitEmail] = useState("");
  const [waitName, setWaitName] = useState("");
  const [waitRole, setWaitRole] = useState("customer");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    // Fetch some workers for preview
    api.get("/workers/search", { params: { limit: 4 } }).then((r) => setFeaturedWorkers(r.data.slice(0, 4))).catch(() => {});
    // Fetch some jobs for preview
    api.get("/jobs/feed", { params: { limit: 4 } }).then((r) => setFeaturedJobs(r.data.slice(0, 4))).catch(() => {});
  }, []);

  const submitWaitlist = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/waitlist", { email: waitEmail, name: waitName, role: waitRole });
      toast.success("You're on the list! We'll be in touch soon.");
      setWaitEmail("");
      setWaitName("");
    } catch (err) {
      toast.error("Could not join waitlist. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="landing-page" className="bg-[#fcfbf9]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 fade-up">
            <div className="kn-overline mb-5">Bharat&apos;s village labour marketplace</div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[0.95] text-gray-900">
              Kaam milega.<br />
              <span className="text-[#ff6b35]">Mazdoori milegi.</span><br />
              <span className="text-[#3f37c9]">Izzat ke saath.</span>
            </h1>
            <p className="mt-7 text-lg text-gray-600 max-w-xl leading-relaxed">
              KaamNow connects 250M+ rural workers with farmers, homeowners and contractors —
              over WhatsApp, voice and a phone any villager already owns. No middlemen. Fair rates. Verified trust.
            </p>
            <div className="mt-9 flex flex-wrap gap-4 items-center">
              <Link to="/marketplace" data-testid="hero-find-workers" className="btn-saffron flex items-center gap-2 h-[52px] px-8 shadow-lg shadow-orange-200/50">
                Find Workers <ArrowRight size={18} />
              </Link>
              <Link to="/worker/job-feed" data-testid="hero-find-work" className="btn-indigo flex items-center gap-2 h-[52px] px-8">
                Find Work <Briefcase size={16} />
              </Link>
              <Link to="/whatsapp-demo" data-testid="hero-whatsapp-demo" className="btn-outline flex items-center gap-2 h-[52px] px-6 border-gray-300 hover:border-[#3f37c9] hover:text-[#3f37c9]">
                <MessageCircle size={16} /> WhatsApp Demo
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
              {[
                { v: stats.workers + "+", l: "Verified workers" },
                { v: stats.villages + "+", l: "Villages" },
                { v: "₹450", l: "Avg daily wage" },
                { v: "<15min", l: "Avg match time" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-3xl text-gray-900">{s.v}</div>
                  <div className="text-xs uppercase tracking-wider text-gray-500 mt-1 font-semibold">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-gray-200">
              <img
                src="https://images.pexels.com/photos/12921278/pexels-photo-12921278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720"
                alt="Mason at work"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3f37c9]/40 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white border border-gray-200 rounded-xl p-4 w-64 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3f37c9] text-white flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Gaon Verified</div>
                  <div className="text-xs text-gray-600">Tier 2 trust badge</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                <Star size={12} className="fill-[#ff6b35] text-[#ff6b35]" /> 4.8
                <span className="mx-1.5">•</span>
                47 jobs done
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-[#ff6b35] text-white rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-widest font-bold opacity-90">Live</div>
              <div className="font-display text-xl">{stats.workers} workers online</div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK PREVIEW / FIND WORK SECTION */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#f0f0ff] rounded-3xl p-8 md:p-12 border border-[#d7d2ff] shadow-sm">
            <div className="flex-1">
              <h2 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight">
                Looking for work? <span className="text-[#3f37c9]">KaamNow has jobs nearby.</span>
              </h2>
              <p className="mt-3 text-gray-600 max-w-lg">
                Join 10,000+ workers who find daily मजदूरी directly on their phones. No more waiting at the chowk.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link to="/signup" className="btn-indigo !px-8">Register as Worker</Link>
                <Link to="/worker/job-feed" className="flex items-center gap-2 text-[#3f37c9] font-bold hover:underline">
                  Browse Job Feed <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="space-y-3">
                {featuredJobs.slice(0, 3).map((j, i) => (
                  <Link to="/worker/job-feed" key={j.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between group hover:border-[#3f37c9] transition-all cursor-pointer" style={{ opacity: 1 - i * 0.15 }}>
                    <div>
                      <div className="font-bold text-sm text-gray-900">{j.title}</div>
                      <div className="text-xs text-gray-500">{j.village} · ₹{j.daily_rate}/day</div>
                    </div>
                    <div className="text-[#3f37c9] opacity-0 group-hover:opacity-100 transition">
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                ))}
                {featuredJobs.length === 0 && (
                  <div className="text-center py-6 text-gray-400 italic text-sm">Loading job opportunities...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED WORKERS / MARKETPLACE PREVIEW */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="kn-overline mb-3">Hire locally</div>
              <h2 className="font-display text-4xl lg:text-5xl tracking-tight">
                Hire <span className="text-[#ff6b35]">verified talent</span> in minutes.
              </h2>
            </div>
            <div className="flex gap-3">
              <Link to="/marketplace" className="btn-saffron flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
                Browse Marketplace <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Simple Filter UI Preview */}
          <div className="mb-10 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 px-3 py-2 border-r border-gray-100">
              <MapPin size={16} className="text-[#ff6b35]" />
              <span className="text-sm font-bold">Pincode:</span>
              <input placeholder="e.g. 302001" className="outline-none text-sm w-24 font-semibold text-gray-800" />
            </div>
            <div className="flex flex-wrap gap-2">
              {["Mason", "Painter", "Helper", "Plumber"].map(s => (
                <span key={s} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 hover:bg-[#3f37c9] hover:text-white transition cursor-pointer">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredWorkers.map((w, i) => (
              <Link 
                key={w.id} 
                to={`/worker/${w.id}`}
                className="kn-card p-5 group hover:border-[#ff6b35] transition-all hover:shadow-xl hover:-translate-y-1"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-4 shadow-inner bg-gray-100">
                  <img src={w.photo_url || "https://images.pexels.com/photos/16476333/pexels-photo-16476333.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-bold text-[#ff6b35] shadow-sm">
                    ⭐ {w.avg_rating.toFixed(1)}
                  </div>
                </div>
                <div className="font-display text-lg mb-1 group-hover:text-[#ff6b35] transition-colors">{w.name}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {w.skills.slice(0, 2).map(s => (
                    <span key={s} className="text-[10px] uppercase font-bold text-gray-400">{s}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-50">
                  <span className="text-gray-500 flex items-center gap-1"><MapPin size={10} /> {w.village}</span>
                  <span className="font-bold text-[#3f37c9]">₹{w.daily_rate}/day</span>
                </div>
                <div className="w-full mt-4 btn-outline !py-2 !text-xs opacity-0 group-hover:opacity-100 transition-all text-center">
                  Request Worker
                </div>
              </Link>
            ))}
            {featuredWorkers.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 italic">No workers listed in this area yet...</div>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-gray-200 bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="kn-overline">How it works</div>
          <h2 className="font-display text-4xl lg:text-5xl tracking-tight mt-3 max-w-3xl">
            Three taps. One worker. <span className="text-[#3f37c9]">Zero middlemen.</span>
          </h2>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Post via WhatsApp or app", d: "Tell us what work, when, and where. Voice-in works. Hindi works. 60 seconds.", icon: MessageCircle, color: "#3f37c9" },
              { n: "02", t: "We find verified workers nearby", d: "Sarpanch-vouched, peer-rated workers within 5km. Trust tiers shown upfront.", icon: MapPin, color: "#ff6b35" },
              { n: "03", t: "Confirm. They arrive. Pay cash or UPI.", d: "Cash-friendly. Rate after work. Reputation grows for everyone.", icon: ShieldCheck, color: "#3f37c9" },
            ].map((s, i) => (
              <div key={i} className="kn-card p-7 fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start justify-between">
                  <div className="font-display text-5xl text-gray-200">{s.n}</div>
                  <s.icon size={28} style={{ color: s.color }} />
                </div>
                <h3 className="font-display text-2xl mt-6">{s.t}</h3>
                <p className="text-gray-600 mt-3 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES TETRIS */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="kn-overline">What makes us different</div>
          <h2 className="font-display text-4xl lg:text-5xl tracking-tight mt-3 max-w-3xl">
            Built for the <span className="text-[#ff6b35]">last village</span>, not the metro.
          </h2>

          <div className="mt-12 grid md:grid-cols-6 gap-5">
            <div className="md:col-span-4 kn-card p-8 bg-[#3f37c9] text-white border-[#3f37c9]">
              <Users size={28} />
              <h3 className="font-display text-3xl mt-6">WhatsApp-native booking</h3>
              <p className="mt-3 text-white/85 max-w-lg">
                700M+ Indians are on WhatsApp. We&apos;re where they already are — no app download, no learning curve.
              </p>
            </div>
            <div className="md:col-span-2 kn-card p-7">
              <Zap size={24} className="text-[#ff6b35]" />
              <h3 className="font-display text-xl mt-5">Voice-first UX</h3>
              <p className="text-gray-600 text-sm mt-2">Speak in Bhojpuri, Marathi, Tamil. We transcribe.</p>
            </div>

            <div className="md:col-span-2 kn-card p-7">
              <ShieldCheck size={24} className="text-[#3f37c9]" />
              <h3 className="font-display text-xl mt-5">3-tier trust system</h3>
              <p className="text-gray-600 text-sm mt-2">Self-verified → Gaon Verified → KaamNow Pro.</p>
            </div>
            <div className="md:col-span-2 kn-card p-7">
              <Briefcase size={24} className="text-[#ff6b35]" />
              <h3 className="font-display text-xl mt-5">Farm calendar booking</h3>
              <p className="text-gray-600 text-sm mt-2">Pre-book crews 7 days ahead for sowing/harvest.</p>
            </div>
            <div className="md:col-span-2 kn-card p-7 bg-[#ff6b35] text-white border-[#ff6b35]">
              <Star size={24} />
              <h3 className="font-display text-xl mt-5">Cash + UPI hybrid</h3>
              <p className="text-white/90 text-sm mt-2">Start with cash. Move to UPI when ready. Never forced.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="bg-white border-y border-gray-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="kn-overline">From the chowk</div>
          <blockquote className="font-display text-3xl lg:text-5xl tracking-tight leading-tight mt-5 text-gray-900">
            &ldquo;Pehle 12 din kaam milta tha, ab 18 din. Bachhon ki padhai bhi chal rahi hai.&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-4">
            <img
              src="https://images.pexels.com/photos/36998122/pexels-photo-36998122.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200"
              alt="Worker"
              className="w-12 h-12 rounded-full object-cover border border-gray-200"
            />
            <div>
              <div className="font-bold">Ramesh Kumar, Mason</div>
              <div className="text-sm text-gray-600">Pratapgarh, UP — 47 jobs on KaamNow</div>
            </div>
          </div>
        </div>
      </section>

      {/* WAITLIST / CTA */}
      <section
        className="py-20 relative bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(63,55,201,0.92), rgba(63,55,201,0.92)), url('https://images.pexels.com/photos/32915125/pexels-photo-32915125.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=1500')",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="font-display text-4xl lg:text-6xl tracking-tighter">
            Ready when your village is.
          </h2>
          <p className="mt-5 text-white/85 text-lg">
            Join the waitlist. Be among the first 100 villages we onboard in 2026.
          </p>
          <form
            onSubmit={submitWaitlist}
            data-testid="waitlist-form"
            className="mt-10 max-w-xl mx-auto bg-white rounded-xl p-5 grid sm:grid-cols-2 gap-3 text-left"
          >
            <input
              data-testid="waitlist-name"
              required
              placeholder="Your name"
              value={waitName}
              onChange={(e) => setWaitName(e.target.value)}
              className="kn-input"
            />
            <input
              data-testid="waitlist-email"
              required
              type="email"
              placeholder="Email"
              value={waitEmail}
              onChange={(e) => setWaitEmail(e.target.value)}
              className="kn-input"
            />
            <select
              data-testid="waitlist-role"
              value={waitRole}
              onChange={(e) => setWaitRole(e.target.value)}
              className="kn-input"
            >
              <option value="customer">I need workers</option>
              <option value="worker">I am a worker</option>
              <option value="partner">NGO / Government partner</option>
            </select>
            <button
              data-testid="waitlist-submit"
              disabled={submitting}
              className="btn-saffron disabled:opacity-60"
            >
              {submitting ? "Joining…" : "Join Waitlist"}
            </button>
          </form>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
          <div className="font-display text-lg text-gray-900">
            kaamnow<span className="text-[#ff6b35]">.com</span>
          </div>
          <div>© {new Date().getFullYear()} KaamNow. Built for Bharat.</div>
          <div className="flex gap-5">
            <Link to="/marketplace" className="hover:text-[#3f37c9]">Marketplace</Link>
            <Link to="/whatsapp-demo" className="hover:text-[#3f37c9]">WhatsApp</Link>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-gray-200 px-6 py-3 flex gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <Link to="/marketplace" className="flex-1 btn-saffron !text-xs !py-3 flex items-center justify-center gap-2">
          <Users size={14} /> Find Workers
        </Link>
        <Link to="/worker/job-feed" className="flex-1 btn-indigo !text-xs !py-3 flex items-center justify-center gap-2">
          <Briefcase size={14} /> Find Work
        </Link>
      </div>
    </div>
  );
}
