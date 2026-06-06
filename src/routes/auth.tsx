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
import { lovable } from "@/integrations/lovable";
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

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6)                        return "Le mot de passe doit contenir au moins 6 caractères.";
    if (!/[0-9]/.test(pwd))                    return "Le mot de passe doit contenir au moins un chiffre.";
    if (!/[#@!$%^&*\-_+=?]/.test(pwd))        return "Le mot de passe doit contenir au moins un symbole (#, @, !, $…).";
    if (!/[A-Z]/.test(pwd))                    return "Le mot de passe doit contenir au moins une lettre majuscule.";
    if (!/[a-z]/.test(pwd))                    return "Le mot de passe doit contenir au moins une lettre minuscule.";
    return null;
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
    // Validate password rules
    const pwdError = validatePassword(password);
    if (pwdError) {
      toast.error(pwdError);
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

  const signInWithGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.redirected) return;
    if (result.error) {
      setLoading(false);
      toast.error(result.error.message);
      return;
    }
    setLoading(false);
    navigate({ to: "/mon-espace" });
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
                  <Field label={t.admin.email} type="email" value={email} onChange={setEmail} autoComplete="username" />
                  <Field label={t.admin.password} type="password" value={password} onChange={setPassword} autoComplete="current-password" />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(v === true)}
                    />
                    Se souvenir de moi
                  </label>
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

                  <Field label={t.admin.email} type="email" value={email} onChange={setEmail} autoComplete="username" />
                  <div className="space-y-1.5">
                    <Label>{t.admin.password}</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
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

                  <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Créer un compte
                  </Button>
                </form>
              )}
            </TabsContent>

          </Tabs>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.auth.or}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={signInWithGoogle}
          >
            <GoogleIcon className="h-4 w-4" />
            {t.auth.continueWithGoogle}
          </Button>
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}



function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
    </div>
  );
}
