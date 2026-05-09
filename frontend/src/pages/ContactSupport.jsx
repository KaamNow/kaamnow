import { MessageCircle, Phone, Mail, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const FAQS = [
  {
    q: "How do I get my first booking?",
    a: "Complete your profile with a photo, clear skills, and your pincode. Customers search by pincode and skill — a complete profile gets found first. Turn on availability (Go Online) from your dashboard.",
  },
  {
    q: "A customer hasn't responded to my interest. What do I do?",
    a: "Customers have 48 hours to approve or reject. If they don't respond, the interest expires and you can apply to other jobs. You can also withdraw your interest from your dashboard.",
  },
  {
    q: "How do I get paid?",
    a: "Payment is directly between you and the customer — KaamNow connects you but does not handle money. Agree on the rate before starting work. The daily rate shown on the job is what the customer has agreed to pay.",
  },
  {
    q: "My pincode lookup isn't working. What should I check?",
    a: "Make sure you enter a valid 6-digit Indian postal code. If the lookup fails, you can still type your village and district manually — just fill in all the fields.",
  },
  {
    q: "How do I update my skills or daily rate?",
    a: "Go to Dashboard → Settings → Edit Worker Profile. You can update your skills, daily rate, bio, and photo at any time.",
  },
  {
    q: "A customer gave me an unfair rating. Can it be removed?",
    a: "Contact our support team via WhatsApp with the job details and we will review it. We take unfair ratings seriously.",
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-3"
      >
        <span className="font-semibold text-gray-800 text-sm leading-snug">{q}</span>
        {open ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function ContactSupport() {
  const waNumber = "919999999999"; // Replace with real support number
  const waMessage = encodeURIComponent("Hello KaamNow Support, I need help with: ");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[#f0f0ff] flex items-center justify-center mx-auto mb-4">
          <HelpCircle size={28} className="text-[#3f37c9]" />
        </div>
        <h1 className="font-display text-3xl tracking-tight">Help & Support</h1>
        <p className="text-gray-500 text-sm mt-2">We're here to help — Monday to Saturday, 9 AM to 6 PM</p>
      </div>

      {/* Contact options */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <a
          href={`https://wa.me/${waNumber}?text=${waMessage}`}
          target="_blank"
          rel="noreferrer"
          className="kn-card p-5 flex flex-col items-center gap-3 text-center hover:border-green-400 transition group"
        >
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition">
            <MessageCircle size={22} className="text-green-600" />
          </div>
          <div>
            <div className="font-bold text-sm">WhatsApp</div>
            <div className="text-xs text-gray-500 mt-0.5">Fastest response</div>
          </div>
        </a>

        <a
          href="tel:+919999999999"
          className="kn-card p-5 flex flex-col items-center gap-3 text-center hover:border-[#3f37c9] transition group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#f0f0ff] flex items-center justify-center group-hover:bg-[#e8e8ff] transition">
            <Phone size={22} className="text-[#3f37c9]" />
          </div>
          <div>
            <div className="font-bold text-sm">Call Us</div>
            <div className="text-xs text-gray-500 mt-0.5">9 AM – 6 PM</div>
          </div>
        </a>

        <a
          href="mailto:support@kaamnow.com"
          className="kn-card p-5 flex flex-col items-center gap-3 text-center hover:border-[#ff6b35] transition group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#fff4f0] flex items-center justify-center group-hover:bg-[#ffe8dc] transition">
            <Mail size={22} className="text-[#ff6b35]" />
          </div>
          <div>
            <div className="font-bold text-sm">Email</div>
            <div className="text-xs text-gray-500 mt-0.5">support@kaamnow.com</div>
          </div>
        </a>
      </div>

      {/* FAQs */}
      <div className="kn-card p-6">
        <h2 className="font-display text-xl mb-1">Common Questions</h2>
        <p className="text-xs text-gray-500 mb-4">Tap a question to see the answer.</p>
        <div>
          {FAQS.map((item, i) => (
            <FAQItem key={i} {...item} />
          ))}
        </div>
      </div>

      {/* Back link */}
      <div className="mt-6 text-center">
        <Link to="/worker/dashboard" className="text-sm text-[#3f37c9] font-bold hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
