import { AuthSession } from "@supabase/supabase-js";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

import { DashboardLayout } from "@craftgen/ui/layout/dashboard";
import { api } from "@craftgen/ui/lib/api";

interface MyRouterContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  auth: AuthSession;
  client: ReturnType<typeof api.useUtils>;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <DashboardLayout
        className={import.meta.env.DEV ? " border-x-4 border-red-500" : ""}
      >
        <Outlet />
      </DashboardLayout>
      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </>
  ),
  notFoundComponent: () => <div>Not Found</div>,
});
