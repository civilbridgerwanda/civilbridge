import Seo from "../components/Seo";

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Seo title="Privacy Policy" description="How CivilBridge handles your data." path="/privacy" />

      <h1 className="text-4xl font-extrabold text-ink-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Note:</strong> this is a starting-point policy reflecting what CivilBridge's
        code actually collects and does today. Have it reviewed by a lawyer before relying
        on it for real users, especially regarding Rwanda's data protection law and any
        other jurisdictions your users are in.
      </div>

      <div className="mt-8 space-y-8 text-slate-600">
        <section>
          <h2 className="text-xl font-bold text-ink-900">Information we collect</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Account details you provide: name, email address, password (stored hashed, never in plain text).</li>
            <li>If you sign in with Google, Facebook, or X: your name and, where the provider shares it, your email address.</li>
            <li>Content you submit: property listings, expert profiles, cost estimate details, AI Studio conversations, and any files/images you upload.</li>
            <li>Basic usage analytics (pages visited, general interactions) via Google Analytics, if enabled.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">How we use it</h2>
          <p className="mt-3">
            To operate your account, generate cost estimates, connect you with properties and
            experts, send account-related emails (verification codes, password resets, status
            updates), and understand how the platform is used so we can improve it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">Third parties we use</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong>Cloudinary</strong> — hosts images and files you upload.</li>
            <li><strong>Our email provider</strong> — delivers account and notification emails.</li>
            <li><strong>Google, Facebook, X</strong> — only if you choose to sign in with them.</li>
            <li><strong>Google Analytics / Tag Manager</strong> — anonymized usage analytics, if configured.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">Your choices</h2>
          <p className="mt-3">
            You can update or delete your account information by contacting us, unsubscribe
            from newsletter emails at any time via the link in those emails, and request a
            copy or deletion of your data by reaching out through our{" "}
            <a href="/contact" className="font-semibold text-brand-500 hover:underline">
              contact page
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink-900">Contact</h2>
          <p className="mt-3">
            Questions about this policy? Reach us via the{" "}
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
