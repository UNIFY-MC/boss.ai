import { redirect } from "next/navigation";

// /agent → /intelligence (page renamed during cockpit unification)
export default function AgentRedirect() {
  redirect("/intelligence");
}
