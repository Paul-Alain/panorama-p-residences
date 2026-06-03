import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LanguageProvider } from "../lib/i18n/language-context";
import { Header } from "../components/layout/header";
import { Footer } from "../components/layout/footer";
import { WhatsAppButton } from "../components/layout/whatsapp-button";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Panorama P – Résidence meublée à Bafoussam" },
      {
        name: "description",
        content:
          "Studios et appartements meublés confortables à Bafoussam, dans un cadre moderne et sécurisé. Réservez votre séjour à la résidence Panorama P.",
      },
      { name: "author", content: "Panorama P" },
      { property: "og:title", content: "Panorama P – Résidence meublée à Bafoussam" },
      {
        property: "og:description",
        content:
          "Studios et appartements confortables dans un cadre moderne et sécurisé à Bafoussam.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Panorama P" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Panorama P – Résidence meublée à Bafoussam" },
      { name: "description", content: "Panorama P est une plateforme de réservation en ligne dédiée à une résidence meublée de standing située à Bafoussam, au Cameroun." },
      { property: "og:description", content: "Panorama P est une plateforme de réservation en ligne dédiée à une résidence meublée de standing située à Bafoussam, au Cameroun." },
      { name: "twitter:description", content: "Panorama P est une plateforme de réservation en ligne dédiée à une résidence meublée de standing située à Bafoussam, au Cameroun." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a59dcb21-fb59-4c8d-83f2-230066fc7482/id-preview-070c6499--7b778ff9-74cc-484d-b552-abc2d2333774.lovable.app-1780495819932.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a59dcb21-fb59-4c8d-83f2-230066fc7482/id-preview-070c6499--7b778ff9-74cc-484d-b552-abc2d2333774.lovable.app-1780495819932.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { location } = useRouterState();
  const bareRoute =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/auth");

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {bareRoute ? (
          <Outlet />
        ) : (
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <Outlet />
            </main>
            <Footer />
            <WhatsAppButton />
          </div>
        )}
        <Toaster position="top-center" richColors />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
