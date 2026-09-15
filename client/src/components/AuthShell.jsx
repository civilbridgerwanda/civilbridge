import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import logo from "../assets/logo.png";

const defaultHighlights = [
  "AI-assisted cost estimates grounded in real Rwandan construction prices",
  "A directory of verified engineers, architects, and contractors",
  "Browse building plans and properties in one place",
  "Message experts and track every project from one dashboard",
];

export default function AuthShell({
  heading,
  subheading,
  children,
  sideTitle = "Build with confidence, backed by real data.",
  sideHighlights = defaultHighlights,
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Content panel - hidden on small screens so the form stays front and center on mobile */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-10 text-white lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <Link to="/" className="relative flex items-center gap-2 text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1.5">
            <img src={logo} alt="" className="h-full w-full object-contain" />
          </span>
          CivilBridge
        </Link>

        <div className="relative">
          <h2 className="max-w-md text-3xl font-extrabold leading-tight xl:text-4xl">{sideTitle}</h2>
          <ul className="mt-8 space-y-4">
            {sideHighlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-brand-50">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                <span className="text-sm leading-relaxed xl:text-base">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-100">CivilBridge — construction intelligence for Rwanda.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
        <Link to="/" className="mb-6 flex items-center gap-2 text-xl font-bold text-ink-900 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 p-1.5">
            <img src={logo} alt="" className="h-full w-full object-contain" />
          </span>
          CivilBridge
        </Link>

        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-ink-900">{heading}</h1>
          <p className="mt-1 text-sm text-slate-500">{subheading}</p>

          <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">{children}</div>

          <p className="mt-6 text-center text-xs text-slate-400">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="font-semibold text-slate-500 underline hover:text-ink-900">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-semibold text-slate-500 underline hover:text-ink-900">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
