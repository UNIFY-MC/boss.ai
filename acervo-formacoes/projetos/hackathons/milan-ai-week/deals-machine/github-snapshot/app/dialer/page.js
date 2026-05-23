import { redirect } from "next/navigation";

// /dialer was merged into /leads in the cockpit redesign.
export default function DialerRedirect() {
  redirect("/leads");
}
