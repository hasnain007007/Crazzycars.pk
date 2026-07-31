import Link from "next/link";

export const metadata = {
  title: "Page not found",
  description: "This page does not exist on CrazzyCars.pk.",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-red-700">404</p>
      <h1 className="mt-3 text-4xl font-bold">This page has driven away.</h1>
      <p className="mt-4 text-gray-600">The page you are looking for does not exist or is no longer available.</p>
      <Link href="/shop" className="mt-8 rounded bg-red-700 px-5 py-3 font-semibold text-white">
        Shop accessories
      </Link>
    </section>
  );
}
