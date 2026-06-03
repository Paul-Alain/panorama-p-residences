import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Se désabonner – Panorama P Residence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: UnsubscribePage,
});

type State =
  | "loading"
  | "valid"
  | "invalid"
  | "already"
  | "submitting"
  | "done"
  | "error";

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    let active = true;
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => active && setState("invalid"));
    return () => {
      active = false;
    };
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) setState("done");
      else if (data.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center shadow-elegant">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
            <p>Vérification… / Checking…</p>
          </div>
        )}

        {state === "valid" && (
          <div className="space-y-4">
            <MailX className="mx-auto h-10 w-10 text-gold" />
            <h1 className="font-display text-xl font-semibold">
              Se désabonner / Unsubscribe
            </h1>
            <p className="text-sm text-muted-foreground">
              Vous ne recevrez plus d'e-mails de Panorama P Residence à cette
              adresse. / You will no longer receive emails from Panorama P
              Residence at this address.
            </p>
            <Button variant="gold" className="w-full" onClick={confirm}>
              Confirmer / Confirm
            </Button>
          </div>
        )}

        {state === "submitting" && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
            <p>Traitement… / Processing…</p>
          </div>
        )}

        {state === "done" && (
          <div className="space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
            <h1 className="font-display text-xl font-semibold">
              Désabonnement confirmé
            </h1>
            <p className="text-sm text-muted-foreground">
              Vous avez été désabonné avec succès. / You have been successfully
              unsubscribed.
            </p>
          </div>
        )}

        {state === "already" && (
          <div className="space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
            <h1 className="font-display text-xl font-semibold">
              Déjà désabonné / Already unsubscribed
            </h1>
            <p className="text-sm text-muted-foreground">
              Cette adresse est déjà désabonnée. / This address is already
              unsubscribed.
            </p>
          </div>
        )}

        {(state === "invalid" || state === "error") && (
          <div className="space-y-3">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="font-display text-xl font-semibold">
              Lien invalide / Invalid link
            </h1>
            <p className="text-sm text-muted-foreground">
              Ce lien de désabonnement est invalide ou a expiré. / This
              unsubscribe link is invalid or has expired.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
