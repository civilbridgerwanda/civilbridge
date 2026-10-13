import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Users, FileText, Sparkles, Upload, Calculator, UserCheck } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { fadeUp, stagger } from "../lib/motion";
import Seo from "../components/Seo";
import LiveCounters from "../components/LiveCounters";
import FeaturedPropertiesCarousel from "../components/FeaturedPropertiesCarousel";

// The three steps of the Estimator, in the order they actually happen.
// Wording is deliberately plain and honest: tools help prepare the numbers,
// but a named professional is responsible for them.
const steps = [
  {
    icon: Upload,
    title: "Share your plan",
    body: "Upload the plan you already have (PDF, AutoCAD, ArchiCAD or IFC) and tell us where in Rwanda you're building.",
  },
  {
    icon: Calculator,
    title: "We prepare your costs",
    body: "We list the materials and quantities you'll need - the Bill of Quantities - and work out the cost using prices for your area.",
  },
  {
    icon: UserCheck,
    title: "A professional checks it",
    body: "A qualified engineer or architect reviews the figures and signs them off before you see them. We'll tell you the moment it's ready.",
  },
];

const explore = [
  {
    icon: MapPin,
    title: "Marketplace",
    body: "Houses, commercial properties and land plots. Filter by district and sector.",
    to: "/marketplace",
    cta: "Browse properties",
  },
  {
    icon: Users,
    title: "Experts",
    body: "Verified engineers, architects and contractors, with reviews from real clients.",
    to: "/experts",
    cta: "Find an expert",
  },
  {
    icon: FileText,
    title: "Building plans",
    body: "Ready-made designs. See the layout up front; the full drawing pack unlocks when you buy.",
    to: "/plans",
    cta: "View plans",
  },
  {
    icon: Sparkles,
    title: "AI Studio",
    body: "Ask a question and get an instant answer - or hand bigger jobs to our estimating engine.",
    to: "/ai-studio",
    cta: "Open AI Studio",
  },
];

const ease = [0.22, 0.61, 0.36, 1];

export default function Home() {
  return (
    <>
      <Seo
        title="Home"
        description="CivilBridge is the construction intelligence platform that helps you plan, estimate, and execute building projects in Rwanda with confidence."
        path="/"
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.h1 variants={fadeUp} className="text-5xl font-extrabold leading-tight tracking-tight text-ink-900">
              Build Smarter.
              <br />
              Build Better.
              <br />
              <span className="text-brand-500">Build in Rwanda.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-lg text-lg text-slate-600">
              CivilBridge is the construction intelligence platform that helps you plan,
              estimate, and execute building projects with confidence. From idea to completion.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/get-started"
                onClick={() => trackEvent("cta_click", { cta: "get_started_hero" })}
                className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
              >
                Get Started →
              </Link>
              <Link
                to="/marketplace"
                className="rounded-lg border-2 border-brand-500 px-6 py-3 font-semibold text-brand-500 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-50"
              >
                Explore Marketplace
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl shadow-xl"
          >
            <img
              src="/images/home/hero-construction.jpg"
              alt="A modern building in Kigali, Rwanda"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              className="h-96 w-full object-cover"
            />
            {/* Directional overlay - darker on the left edge (nearest the
                headline/copy column) fading to transparent, so the image
                leads the eye back toward the text instead of away from it. */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-900/40 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-5 pt-16 text-white">
              <p className="text-xl font-bold">Expert-Verified Results</p>
              <p className="text-sm text-slate-200">Professional guidance every step</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live, real numbers - verified experts and projects estimated. */}
      <LiveCounters />

      {/* How it works - the Estimator in three steps. */}
      <section className="bg-brand-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-4xl font-extrabold text-ink-900">
              Smart Cost Estimation
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-slate-600">
              Share your building plan and get a clear cost breakdown - prepared with smart tools, and checked by a real
              professional before it reaches you.
            </motion.p>

            <ol className="mt-8 space-y-6">
              {steps.map((step, i) => (
                <motion.li key={step.title} variants={fadeUp} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">
                      <span className="mr-1 text-brand-400">{i + 1}.</span>
                      {step.title}
                    </p>
                    <p className="text-slate-600">{step.body}</p>
                  </div>
                </motion.li>
              ))}
            </ol>

            <motion.div variants={fadeUp}>
              <Link
                to="/estimator"
                onClick={() => trackEvent("cta_click", { cta: "try_estimator" })}
                className="mt-8 inline-block rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
              >
                Try the Estimator →
              </Link>
              <p className="mt-4 text-sm text-slate-500">
                Smart tools do the heavy lifting. A real person is always responsible for the final numbers.
              </p>
            </motion.div>
          </motion.div>

          <motion.img
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            src="/images/home/engineers-reviewing-plans.jpg"
            alt="Engineers reviewing plans"
            loading="lazy"
            decoding="async"
            className="rounded-2xl shadow-lg"
          />
        </div>
      </section>

      {/* Everything else, in one place. */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-4xl font-extrabold text-ink-900">Everything for your build</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            Find land, hire verified professionals, and start from a proven design.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {explore.map((item) => (
            <motion.div key={item.title} variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.3, ease } }}>
              <Link
                to={item.to}
                className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-slate-50 p-7 transition-shadow duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:shadow-lg"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white">
                  <item.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink-900">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm text-slate-600">{item.body}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-500 transition-transform duration-200 group-hover:translate-x-1">
                  {item.cta} <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Real listings only - hides itself until there are some. */}
      <FeaturedPropertiesCarousel />

      {/* Final CTA */}
      <section className="bg-brand-gradient py-20 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            className="text-4xl font-extrabold"
          >
            Ready to Start Your Construction Journey?
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-brand-50"
          >
            Upload your plan and get an expert-verified cost estimate.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <Link
              to="/get-started"
              onClick={() => trackEvent("cta_click", { cta: "get_started_closing_band" })}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-600 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-50"
            >
              Get Started — It's Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/sign-in"
              onClick={() => trackEvent("cta_click", { cta: "sign_in_closing_band" })}
              className="text-sm font-medium text-brand-50 underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:text-white hover:underline"
            >
              Already have an account? Sign in
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
