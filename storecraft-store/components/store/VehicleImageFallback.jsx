/**
 * Neutral vehicle silhouette — used when a catalog row has no licensed photo.
 * Does not imply a specific make/model.
 */
export function VehicleImageFallback({ className = "" }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-b from-[#F3F4F6] to-[#E5E7EB] ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 120 64"
        width="72"
        height="38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-70"
      >
        <path
          d="M14 42h8.5c1.2-6.2 6.6-11 13.2-11h48.6c6.6 0 12 4.8 13.2 11H106c2.2 0 4 1.8 4 4v4c0 1.1-.9 2-2 2h-6.2a9 9 0 0 1-17.6 0H35.8a9 9 0 0 1-17.6 0H12c-1.1 0-2-.9-2-2v-4c0-2.2 1.8-4 4-4Z"
          fill="#9CA3AF"
        />
        <path
          d="M38 31c2.4-7.2 8.2-12 15.4-12h13.2c7.2 0 13 4.8 15.4 12"
          stroke="#D1D5DB"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="27" cy="48" r="6.5" fill="#6B7280" />
        <circle cx="93" cy="48" r="6.5" fill="#6B7280" />
        <circle cx="27" cy="48" r="2.5" fill="#E5E7EB" />
        <circle cx="93" cy="48" r="2.5" fill="#E5E7EB" />
      </svg>
    </div>
  );
}

export default VehicleImageFallback;
