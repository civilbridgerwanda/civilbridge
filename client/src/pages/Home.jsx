import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
  MapPin,
  Users,
} from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { fadeUp, stagger } from "../lib/motion";
import Seo from "../components/Seo";
import AnimatedCounter from "../components/AnimatedCounter";

const stats = [
  { value: 500, suffix: "+", label: "Verified Professionals" },
  { value: 1200, suffix: "+", label: "Projects Estimated" },
  { value: 95, suffix: "%", label: "Cost Accuracy Rate" },
  { value: null, display: "24/7", label: "Platform Access" },
];

const featuredProperties = [
  {
    title: "Estate Development",
    image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
  },
  {
    title: "Prime Land Plots",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  },
  {
    title: "New Construction",
    image: "https://images.unsplash.com/photo-1541976590-713941681591?w=800&q=80",
  },
  {
    title: "Modern Residential Complex",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  },
];

const helpCards = [
  {
    icon: "🧮",
    bg: "bg-brand-500",
    title: "Accurate Cost Estimation",
    body: "Get realistic construction cost estimates based on Rwanda-specific pricing, materials, and labor rates. Make financially safe decisions from day one.",
  },
  {
    icon: "🛡️",
    bg: "bg-brand-400",
    title: "Expert Verification",
    body: "Every plan and estimate can be reviewed by verified engineers and architects. AI accelerates, professionals validate.",
  },
  {
    icon: "📈",
    bg: "bg-brand-700",
    title: "Full Project Journey",
    body: "From initial budget analysis to completed construction, track every phase with transparency and professional oversight.",
  },
];

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
            <motion.h1 variants={fadeUp} className="text-5xl font-extrabold leading-tight text-ink-900">
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
                className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
              >
                Get Started →
              </Link>
              <Link
                to="/marketplace"
                className="rounded-lg border-2 border-brand-500 px-6 py-3 font-semibold text-brand-500 transition hover:bg-brand-50"
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
              src="https://images.unsplash.com/photo-1541976590-713941681591?w=1000&q=80"
              alt="Construction site"
              loading="lazy"
              decoding="async"
              className="h-96 w-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-5 text-white">
              <p className="text-xl font-bold">Expert-Verified Results</p>
              <p className="text-sm text-slate-200">Professional guidance every step</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How CivilBridge Helps You */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="text-4xl font-extrabold text-ink-900"
        >
          How CivilBridge Helps You
        </motion.h2>
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-slate-500"
        >
          We transform construction uncertainty into clear, actionable insights through
          intelligent tools and expert validation.
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-12 grid gap-6 text-left md:grid-cols-3"
        >
          {helpCards.map((c) => (
            <motion.div
              key={c.title}
              variants={fadeUp}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-8 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} text-2xl`}>
                {c.icon}
              </div>
              <h3 className="text-xl font-bold text-ink-900">{c.title}</h3>
              <p className="mt-3 text-slate-600">{c.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Smart Cost Estimation */}
      <section className="bg-brand-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2 md:items-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-extrabold text-ink-900">
              Smart Cost Estimation
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-slate-600">
              Our AI-powered estimator analyzes your project requirements and generates
              detailed cost breakdowns including materials, labor, and timelines.
            </motion.p>

            <ul className="mt-8 space-y-6">
              {[
                { icon: "✨", title: "Upload or Describe", body: "Upload existing plans or describe your vision conversationally." },
                { icon: "⚡", title: "AI Analysis", body: "Intelligent processing generates Bill of Quantities and cost estimates." },
                { icon: "✔️", title: "Professional Review", body: "Get expert validation and approval before execution." },
              ].map((step) => (
                <motion.li key={step.title} variants={fadeUp} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                    {step.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">{step.title}</p>
                    <p className="text-slate-600">{step.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>

            <motion.div variants={fadeUp}>
              <Link
                to="/estimator"
                onClick={() => trackEvent("cta_click", { cta: "try_estimator" })}
                className="mt-8 inline-block rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
              >
                Try the Estimator →
              </Link>
            </motion.div>
          </motion.div>

          <motion.img
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1000&q=80"
            alt="Engineers reviewing plans"
            loading="lazy"
            decoding="async"
            className="rounded-2xl shadow-lg"
          />
        </div>
      </section>

      {/* Discover Properties & Connect with Experts */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="text-4xl font-extrabold text-ink-900"
        >
          Discover Properties &amp; Connect with Experts
        </motion.h2>
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-slate-500"
        >
          Browse verified properties, land plots, and connect with trusted engineers,
          architects, and contractors.
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-12 grid gap-6 text-left md:grid-cols-2"
        >
          <motion.div
            variants={fadeUp}
            className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-400 p-10 text-white transition hover:-translate-y-1 hover:shadow-xl"
          >
            <MapPin className="h-8 w-8" />
            <h3 className="mt-4 text-2xl font-bold">Property Marketplace</h3>
            <p className="mt-3 text-brand-50">
              Explore houses, commercial properties, and land plots across Rwanda. Filter by
              location, price, and type.
            </p>
            <Link to="/marketplace" className="mt-6 inline-block font-semibold hover:underline">
              Browse Properties →
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-600 p-10 text-white transition hover:-translate-y-1 hover:shadow-xl"
          >
            <Users className="h-8 w-8" />
            <h3 className="mt-4 text-2xl font-bold">Expert Directory</h3>
            <p className="mt-3 text-brand-100">
              Find and connect with verified construction professionals. Read reviews and
              book consultations.
            </p>
            <Link to="/experts" className="mt-6 inline-block font-semibold hover:underline">
              Find Experts →
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Ready-Made & Custom Plans */}
      <section className="bg-gradient-to-b from-brand-50 to-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2 md:items-center">
          <motion.img
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=80"
            alt="A completed house built from a CivilBridge plan"
            loading="lazy"
            decoding="async"
            className="rounded-2xl shadow-lg"
          />

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-extrabold text-ink-900">
              Ready-Made &amp; Custom Plans
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-slate-600">
              Browse our library of professionally designed building plans or generate
              custom designs using AI based on your budget, land, and preferences.
            </motion.p>

            <ul className="mt-8 space-y-4">
              {[
                "Pre-designed plans for common building types",
                "AI-generated custom designs based on your requirements",
                "Professional review and approval workflow",
              ].map((item) => (
                <motion.li key={item} variants={fadeUp} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />
                  <span className="text-slate-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div variants={fadeUp}>
              <Link
                to="/plans"
                onClick={() => trackEvent("cta_click", { cta: "view_plans" })}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
              >
                View Plans <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* AI-Powered Construction Intelligence */}
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2 md:items-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-extrabold leading-tight text-ink-900">
              AI-Powered Construction Intelligence
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-slate-600">
              Our AI Studio helps you make smarter decisions with conversational planning,
              feasibility analysis, and intelligent recommendations tailored to the
              Rwandan market.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <FileText className="h-6 w-6 text-brand-500" />
                <p className="mt-3 font-bold text-ink-900">Document Generation</p>
                <p className="mt-1 text-sm text-slate-500">Auto-generate project packages</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <Layers className="h-6 w-6 text-brand-500" />
                <p className="mt-3 font-bold text-ink-900">Feasibility Analysis</p>
                <p className="mt-1 text-sm text-slate-500">Budget vs. requirements check</p>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link
                to="/ai-studio"
                onClick={() => trackEvent("cta_click", { cta: "open_ai_studio" })}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
              >
                Open AI Studio <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.img
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1000&q=80"
            alt="Aerial view of a mixed-use development"
            loading="lazy"
            decoding="async"
            className="rounded-2xl shadow-lg"
          />
        </div>
      </section>

      {/* Built on Trust & Quality */}
      <section className="bg-gradient-to-br from-ink-900 via-brand-800 to-brand-600 py-20 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="text-4xl font-extrabold"
          >
            Built on Trust &amp; Quality
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-brand-100"
          >
            CivilBridge is designed specifically for Rwanda with local expertise, verified
            professionals, and realistic cost intelligence.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="mt-14 grid grid-cols-2 gap-8 md:grid-cols-4"
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={fadeUp}>
                <p className="text-4xl font-extrabold text-gold-400">
                  {s.display ?? <AnimatedCounter to={s.value} suffix={s.suffix} />}
                </p>
                <p className="mt-2 text-sm text-brand-100">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Properties & Developments */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="text-4xl font-extrabold text-ink-900"
          >
            Featured Properties &amp; Developments
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-slate-500"
          >
            Explore a selection of quality properties across Rwanda.
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
          className="mt-12 flex snap-x gap-6 overflow-x-auto px-6 pb-4 [scrollbar-width:thin] md:mx-auto md:max-w-7xl"
        >
          {featuredProperties.map((p) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              className="group relative h-72 w-72 shrink-0 snap-start overflow-hidden rounded-2xl shadow-md md:w-80"
            >
              <img
                src={p.image}
                alt={p.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-4 left-4 text-lg font-bold text-white">{p.title}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-4 text-center">
          <Link to="/marketplace" className="inline-flex items-center gap-2 font-semibold text-brand-500 hover:underline">
            Browse all properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-brand-600 to-brand-400 py-20 text-center text-white">
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
            Join thousands of Rwandans building smarter with CivilBridge. Get your free
            cost estimate today.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            className="mt-8 flex flex-wrap justify-center gap-4"
          >
            <Link
              to="/estimator"
              onClick={() => trackEvent("cta_click", { cta: "get_free_estimate" })}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-600 transition hover:bg-brand-50"
            >
              Get Free Estimate <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/get-started"
              onClick={() => trackEvent("cta_click", { cta: "sign_up_footer_cta" })}
              className="rounded-lg border-2 border-white/70 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Sign Up
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
