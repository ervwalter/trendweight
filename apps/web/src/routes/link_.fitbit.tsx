import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/use-auth";
import { requireAuth } from "@/lib/auth/auth-guard";
import { ensureProfile } from "@/lib/loaders/utils";
import { Layout } from "@/components/layout";
import { Heading } from "@/components/common/heading";

// A direct deep-link that bounces straight into the Fitbit OAuth flow. The normal
// "Connect Fitbit Account" button on /link and /settings does the same thing, so this
// route is mostly a convenience URL that can be handed to a user (e.g. to help someone
// reconnect after an accidental disconnect).
export const Route = createFileRoute("/link_/fitbit")({
  beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
  loader: async ({ context }) => {
    await ensureProfile(context.auth.getToken);
    return null;
  },
  component: ConnectFitbitPage,
});

function ConnectFitbitPage() {
  const { getToken } = useAuth();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const connect = async () => {
      try {
        const token = await getToken();
        const response = await apiRequest<{ url?: string; authorizationUrl?: string }>("/fitbit/link", { token });
        const redirectUrl = response.authorizationUrl || response.url;
        if (redirectUrl) {
          window.location.assign(redirectUrl);
        } else {
          setFailed(true);
        }
      } catch (error) {
        console.error("Error getting fitbit authorization URL:", error);
        setFailed(true);
      }
    };

    connect();
  }, [getToken]);

  return (
    <Layout title="Connect Fitbit">
      <Heading level={1}>Connect Fitbit</Heading>
      {failed ? (
        <p className="text-muted-foreground mt-4">
          Something went wrong starting the Fitbit connection. Please try again, or email{" "}
          <a href="mailto:erv@ewal.net" className="text-link hover:text-link underline">
            erv@ewal.net
          </a>{" "}
          if the problem persists. You can also head back to your{" "}
          <Link to="/settings" className="text-link hover:text-link underline">
            settings
          </Link>
          .
        </p>
      ) : (
        <p className="text-muted-foreground mt-4">Sending you to Fitbit to authorize the connection...</p>
      )}
    </Layout>
  );
}
