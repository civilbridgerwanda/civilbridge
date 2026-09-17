import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import logo from "../assets/logo.png";
import NewsletterSignup from "./NewsletterSignup";

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
  { Icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { Icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { Icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { Icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
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
