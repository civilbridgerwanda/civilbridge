import Seo from "../components/Seo";

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Seo title="Terms of Service" description="The terms that govern using CivilBridge." path="/terms" />

      <h1 className="text-4xl font-extrabold text-ink-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-tertiary">Last updated: September 17, 2026</p>

      <div className="mt-8 max-w-prose space-y-8 text-slate-600">
        <section>
          <h2 className="text-xl font-bold text-ink-900">Using CivilBridge</h2>
          <p className="mt-3">
            By creating an account or using CivilBridge, you agree to provide accurate
            information, keep your login credentials secure, and use the platform lawfully.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">Estimates and AI-generated content</h2>
          <p className="mt-3">
            Cost estimates and AI Studio responses are generated automatically and are
            starting points, not guarantees. <strong>Always have critical decisions —
            budgets, structural plans, contracts — reviewed by a licensed engineer,
            architect, or other qualified professional</strong> before acting on them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">Listings and expert profiles</h2>
          <p className="mt-3">
            You're responsible for the accuracy of any property listing or expert profile you
            create. CivilBridge doesn't independently verify pricing, property availability,
            or professional credentials beyond what's noted on a verified expert's profile.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">Account termination</h2>
          <p className="mt-3">
            You may stop using CivilBridge and request account deletion at any time. We may
            suspend or remove accounts that violate these terms or misuse the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">Limitation of liability</h2>
          <p className="mt-3">
            CivilBridge is provided "as is." We aren't liable for decisions made based on
            estimates, listings, or connections made through the platform — always verify
            critical information independently.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">Contact</h2>
          <p className="mt-3">
            Questions about these terms? Reach us via the{" "}
            <a href="/contact" className="font-semibold text-brand-500 hover:underline">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
