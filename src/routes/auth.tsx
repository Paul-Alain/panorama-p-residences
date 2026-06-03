import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";
import { PhoneInput } from "@/components/forms/phone-input";
import {
  LAST_EMAIL_KEY,
  REMEMBER_KEY,
  SESSION_MARKER_KEY,
} from "@/lib/auth-prefs";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion – Panorama P" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/mon-espace" });
    });
    // Pre-fill the last used email for returning clients.
    const stored = window.localStorage.getItem(LAST_EMAIL_KEY);
    if (stored) setEmail(stored);
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      // Remember the email (never the password) for next time.
      window.localStorage.setItem(LAST_EMAIL_KEY, email);
      if (remember) {
        window.localStorage.setItem(REMEMBER_KEY, "1");
        window.sessionStorage.removeItem(SESSION_MARKER_KEY);
      } else {
        // Keep the session only for the current tab.
        window.localStorage.setItem(REMEMBER_KEY, "0");
        window.sessionStorage.setItem(SESSION_MARKER_KEY, "1");
      }
    }
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error(
          "Votre adresse email n'est pas encore confirmée. Veuillez vérifier votre boîte mail.",
        );
        return;
      }
      toast.error(error.message);
      return;
    }
    navigate({ to: "/mon-espace" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length < 2) {
      toast.error(t.auth.nameError);
      return;
    }
    // International format: leading + then 8 to 15 digits (E.164).
    if (!/^\+[1-9]\d{7,14}$/.test(trimmedPhone)) {
      toast.error(t.auth.phoneError);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: trimmedName, phone_number: trimmedPhone },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // When email confirmation is required, Supabase returns a user with no active session.
    if (data.user && !data.session) {
      setSignupSent(true);
      toast.success(
        "Un email de validation a été envoyé à votre adresse. Veuillez vérifier votre boîte mail.",
      );
      return;
    }
    navigate({ to: "/mon-espace" });
  };

  const forgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
    toast.success(
      "Un email de réinitialisation a été envoyé. Veuillez vérifier votre boîte mail.",
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo />
          <p className="text-sm text-muted-foreground">{t.admin.login}</p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-elegant">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t.admin.signIn}</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {forgotMode ? (
                resetSent ? (
                  <div className="mt-5 space-y-4 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                      <MailCheck className="h-6 w-6 text-gold" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Un email de réinitialisation a été envoyé à votre adresse. Veuillez vérifier votre boîte mail.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setForgotMode(false);
                        setResetSent(false);
                      }}
                    >
                      Retour à la connexion
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={forgotPassword} className="mt-5 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Saisissez votre adresse email pour recevoir un lien de réinitialisation.
                    </p>
                    <Field label={t.admin.email} type="email" value={email} onChange={setEmail} />
                    <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Envoyer le lien
                    </Button>
                    <button
                      type="button"
                      onClick={() => setForgotMode(false)}
                      className="w-full text-center text-sm text-muted-foreground hover:text-gold"
                    >
                      Retour à la connexion
                    </button>
                  </form>
                )
              ) : (
                <form onSubmit={signIn} className="mt-5 space-y-4">
                  <Field label={t.admin.email} type="email" value={email} onChange={setEmail} />
                  <Field label={t.admin.password} type="password" value={password} onChange={setPassword} />
                  <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t.admin.signIn}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="w-full text-center text-sm text-muted-foreground hover:text-gold"
                  >
                    Mot de passe oublié ?
                  </button>
                </form>
              )}
            </TabsContent>


            <TabsContent value="signup">
              {signupSent ? (
                <div className="mt-5 space-y-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                    <MailCheck className="h-6 w-6 text-gold" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Un email de validation a été envoyé à votre adresse. Veuillez vérifier votre boîte mail.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setSignupSent(false)}
                  >
                    Retour
                  </Button>
                </div>
              ) : (
                <form onSubmit={signUp} className="mt-5 space-y-4">
                  <Field label={t.auth.fullName} type="text" value={fullName} onChange={setFullName} />
                  <div className="space-y-1.5">
                    <Label>{t.auth.phone}</Label>
                    <PhoneInput value={phone} onChange={setPhone} required />
                  </div>

                  <Field label={t.admin.email} type="email" value={email} onChange={setEmail} />
                  <Field label={t.admin.password} type="password" value={password} onChange={setPassword} />

                  <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Créer un compte
                  </Button>
                </form>
              )}
            </TabsContent>

          </Tabs>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-gold">
            ← {t.nav.home}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        minLength={type === "password" ? 6 : undefined}
      />
    </div>
  );
}
