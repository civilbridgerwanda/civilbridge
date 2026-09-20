import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import logo from "../assets/logo.png";
import NewsletterSignup from "./NewsletterSignup";

// Lucide has no official X (formerly Twitter) glyph, so we render the
// current brand mark directly rather than the old bird icon.
function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const columns = [
  {
    heading: "Platform",
    links: [
      { label: "Plans Library", to: "/plans" },
      { label: "Cost Estimator", to: "/estimator" },
      { label: "Marketplace", to: "/marketplace" },
      { label: "AI Studio", to: "/ai-studio" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", to: "/docs" },
      { label: "Help Center", to: "/help" },
      { label: "Expert Directory", to: "/experts" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

const socials = [
  { Icon: Facebook, href: "https://www.facebook.com/profile.php?id=61592466209501", label: "Facebook" },
  { Icon: XIcon, href: "https://x.com/CivilBridgeRw", label: "X (Twitter)" },
  {
    Icon: Instagram,
    href: "https://www.instagram.com/civil.bridge?utm_source=qr&stkn=MWVrNHJoNnoyZmVydw==",
    label: "Instagram",
  },
  {
    Icon: Linkedin,
    href: "https://www.linkedin.com/in/civil-bridge-417023438?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    label: "LinkedIn",
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
              <img src={logo} alt="CivilBridge" width="28" height="28" className="h-7 w-7 invert" loading="lazy" />
              CivilBridge
            </Link>
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              Rwanda's trusted construction intelligence platform. Making construction
              planning more accurate, transparent, and accessible.
            </p>
            <div className="mt-5 flex gap-4">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-slate-400 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:text-white"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>

            <div className="mt-6">
              <NewsletterSignup />
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="font-bold text-white">{col.heading}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-slate-400 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} CivilBridge. All rights reserved. Made for Rwanda and East Africa.
        </div>
      </div>
    </footer>
  );
}
