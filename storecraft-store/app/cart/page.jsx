import { permanentRedirect } from "next/navigation";

export default function CartRedirect() {
  permanentRedirect("/shop");
}
