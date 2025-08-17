import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/use-auth";
import { Button } from "@/components/ui/button";

export function InfoButtons() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="flex w-full flex-col items-center gap-4 md:flex-row">
      <Button asChild variant="success" size="xl" className="w-full font-normal md:w-80">
        <Link to="/about">Learn More</Link>
      </Button>
      {isLoggedIn ? (
        <Button asChild variant="default" size="xl" className={`w-full font-normal md:w-80`}>
          <Link to="/dashboard">Go To Dashboard</Link>
        </Button>
      ) : (
        <Button asChild variant="default" size="xl" className={`w-full font-normal md:w-80`}>
          <Link to="/login">Log In / Sign Up</Link>
        </Button>
      )}
    </div>
  );
}
