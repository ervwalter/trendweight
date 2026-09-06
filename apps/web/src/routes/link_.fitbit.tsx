import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth/auth-guard";
import { ensureProfile } from "@/lib/loaders/utils";
import { Layout } from "@/components/layout";
import { ConnectFitbit } from "@/components/providers/connect-fitbit";

// A direct deep-link that bounces straight into the Fitbit OAuth flow. The normal
// "Connect Fitbit Account" button on /link and /settings does the same thing, so this
// route is mostly a convenience URL that can be handed to a user (e.g. to help someone
// reconnect after an accidental disconnect).
export const Route = createFileRoute("/link_/fitbit")({
  beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
  loader: async ({ context }) => {
    await ensureProfile(context.queryClient, context.auth.getToken);
    return null;
  },
  component: ConnectFitbitPage,
});

function ConnectFitbitPage() {
  return (
    <Layout title="Connect Fitbit">
      <ConnectFitbit />
    </Layout>
  );
}
