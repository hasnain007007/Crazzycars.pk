import RunCourierApp from "@/components/runcourier/RunCourierApp";

export const metadata = { title: "Run Courier" };

export default function Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Run Courier
        </h1>
        <p className="text-sm text-slate-500">
          Book via Trax, M&amp;P, TCS, Leopard2, Daewoo, and more — separate from PostEx.
        </p>
      </div>
      <RunCourierApp />
    </div>
  );
}
