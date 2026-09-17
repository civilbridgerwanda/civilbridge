import { Link } from "react-router-dom";
import Seo from "../components/Seo";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center">
      <Seo title="Page not found" description="This page doesn't exist." />
      <p className="text-sm font-semibold text-brand-500">404</p>
      <h1 className="mt-2 text-4xl font-extrabold text-ink-900">Page not found</h1>
      <p className="mt-4 text-slate-500">The page you're looking for doesn't exist or has moved.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
      >
        Back to Home
      </Link>
    </section>
  );
}
