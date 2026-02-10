import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
  // Check if user is authenticated
  try {
    const session = await auth0.getSession();
    if (session?.user) {
      // Redirect authenticated users to dashboard
      redirect("/dashboard");
    }
  } catch (error: any) {
    // If there's an error (like JWEInvalid), just show landing page
    // Silently handle errors
  }

  return <LandingPage />;
}
