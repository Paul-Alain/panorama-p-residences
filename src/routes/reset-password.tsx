import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, MailCheck, KeyRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe – Panorama P" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setValidLink(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidLink(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Votre mot de passe a été mis à jour.");
    setTimeout(() => navigate({ to: "/mon-espace" }), 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo />
          <p className="text-sm text-muted-foreground">Réinitialisation du mot de passe</p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-elegant">
          {!ready ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                <MailCheck className="h-6 w-6 text-gold" />
              </div>
              <p className="text-sm text-muted-foreground">
                Mot de passe mis à jour. Redirection en cours…
              </p>
            </div>
          ) : !validLink ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ce lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.
              </p>
              <Button asChild variant="gold" className="w-full">
                <Link to="/auth">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                <KeyRound className="h-6 w-6 text-gold" />
              </div>
              <div className="space-y-1.5">
                <Label>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <div className="rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Le mot de passe doit contenir :</p>
                  <div className="flex flex-col gap-1 text-xs">
                    {[
                      { ok: password.length >= 6,                                    label: "Au moins 6 caractères" },
                      { ok: /[0-9]/.test(password),                                  label: "Au moins 1 chiffre (0-9)" },
                      { ok: /[#@!$%^&*\-_+=?]/.test(password),                      label: "Au moins 1 symbole (#, @, !, $…)" },
                      { ok: /[A-Z]/.test(password),                                  label: "Au moins 1 lettre majuscule (A-Z)" },
                      { ok: /[a-z]/.test(password),                                  label: "Au moins 1 lettre minuscule (a-z)" },
                    ].map(({ ok, label }) => (
                      <span key={label} className={`flex items-center gap-1.5 ${ok && password.length > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] font-bold ${ok && password.length > 0 ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                          {ok && password.length > 0 ? "✓" : "○"}
                        </span>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmer le mot de passe</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
                )}
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Mettre à jour
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-gold">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
