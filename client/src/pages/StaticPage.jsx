import Seo from "../components/Seo";

export default function StaticPage({ title, description }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Seo title={title} description={description} />
      <h1 className="text-4xl font-extrabold text-ink-900">{title}</h1>
      <p className="mt-4 text-slate-500">{description}</p>
      <p className="mt-8 text-sm text-slate-400">This page is coming soon.</p>
    </section>
  );
}
