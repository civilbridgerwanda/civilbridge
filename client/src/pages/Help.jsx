import { Link } from "react-router-dom";
import Seo from "../components/Seo";

const faqs = [
  {
    q: "How accurate are the cost estimates?",
    a: "Estimates are AI-generated from Rwanda-specific construction data as a fast first pass. For anything you're about to act on financially, have it reviewed by one of the verified engineers or contractors in the Expert Directory.",
  },
  {
    q: "How do I contact an expert or property owner?",
    a: "Open their profile from the Expert Directory or Marketplace and use the Message button. Conversations happen inside CivilBridge, from your dashboard's Messages tab.",
  },
  {
    q: "How do I list a property or offer expert services?",
    a: "Use \"List Property\" from the Marketplace, or \"Join as Expert\" from the Expert Directory. Both require a free account.",
  },
  {
    q: "Is my data secure?",
    a: "Account details are stored hashed, never in plain text, and payment history is only visible to you. See the Privacy Policy for full details on what's collected and why.",
  },
];

export default function Help() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Seo
        title="Help Center"
        description="Answers to common questions about CivilBridge, plus how to reach us directly."
        path="/help"
      />

      <h1 className="text-4xl font-extrabold text-ink-900">Help Center</h1>
      <p className="mt-4 text-lg text-slate-600">
        A handful of the questions we hear most. If yours isn't here, reach us directly through
        the{" "}
        <Link to="/contact" className="font-semibold text-brand-600 hover:underline">
          contact form
        </Link>{" "}
        and a real person will get back to you.
      </p>

      <div className="mt-10 space-y-6">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border border-slate-200 p-6">
            <p className="font-bold text-ink-900">{f.q}</p>
            <p className="mt-2 text-sm text-slate-600">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-brand-50 p-6 text-center">
        <p className="font-bold text-ink-900">Still stuck?</p>
        <p className="mt-1 text-sm text-slate-600">
          Send us a message and we'll follow up by email.
        </p>
        <Link
          to="/contact"
          className="mt-4 inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
