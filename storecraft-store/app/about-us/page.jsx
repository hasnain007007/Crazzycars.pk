import { permanentRedirect } from "next/navigation";

/** Duplicate of /about — keep one canonical About URL. */
export default function AboutUsRedirect() {
  permanentRedirect("/about");
}
