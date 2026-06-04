import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { opGetSettings, opUpdateSettings } from "@/lib/operations.functions";

interface Form {
  name: string;
  logo_url: string;
  currency: string;
  checkin_time: string;
  checkout_time: string;
  deposit_percent: number;
  cancellation_policy: string;
  taxes: string;
  email_notifications: boolean;
  language: "fr" | "en" | "de";
}

const DEFAULTS: Form = {
  name: "Résidence Panorama P",
  logo_url: "",
  currency: "FCFA",
  checkin_time: "14:00",
  checkout_time: "11:00",
  deposit_percent: 30,
  cancellation_policy: "",
  taxes: "",
  email_notifications: true,
  language: "fr",
};

export function SettingsAdmin() {
  const qc = useQueryClient();
  const runGet = useServerFn(opGetSettings);
  const runUpdate = useServerFn(opUpdateSettings);
  const [form, setForm] = useState<Form>(DEFAULTS);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["op-settings"],
    queryFn: () => runGet(),
    staleTime: 300_000,
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? DEFAULTS.name,
        logo_url: data.logo_url ?? "",
        currency: data.currency ?? "FCFA",
        checkin_time: data.checkin_time ?? "14:00",
        checkout_time: data.checkout_time ?? "11:00",
        deposit_percent: data.deposit_percent ?? 30,
        cancellation_policy: data.cancellation_policy ?? "",
        taxes: data.taxes ?? "",
        email_notifications: data.email_notifications ?? true,
        language: (data.language as Form["language"]) ?? "fr",
      });
    }
  }, [data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      await runUpdate({ data: form });
      await qc.invalidateQueries({ queryKey: ["op-settings"] });
      toast.success("Paramètres enregistrés.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <Field label="Nom de la résidence">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Logo (URL)">
          <Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Devise">
            <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} />
          </Field>
          <Field label="Acompte demandé (%)">
            <Input type="number" min={0} max={100} value={form.deposit_percent} onChange={(e) => set("deposit_percent", Number(e.target.value))} />
          </Field>
          <Field label="Heure de check-in">
            <Input type="time" value={form.checkin_time} onChange={(e) => set("checkin_time", e.target.value)} />
          </Field>
          <Field label="Heure de check-out">
            <Input type="time" value={form.checkout_time} onChange={(e) => set("checkout_time", e.target.value)} />
          </Field>
        </div>
        <Field label="Politique d'annulation">
          <Textarea value={form.cancellation_policy} onChange={(e) => set("cancellation_policy", e.target.value)} rows={3} />
        </Field>
        <Field label="Taxes éventuelles">
          <Input value={form.taxes} onChange={(e) => set("taxes", e.target.value)} placeholder="Ex. taxe de séjour 500 FCFA / nuit" />
        </Field>
        <Field label="Langue de l'interface">
          <Select value={form.language} onValueChange={(v) => set("language", v as Form["language"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
          <div>
            <p className="text-sm font-medium">Notifications email</p>
            <p className="text-xs text-muted-foreground">Envoyer les confirmations et reçus par e-mail.</p>
          </div>
          <Switch checked={form.email_notifications} onCheckedChange={(v) => set("email_notifications", v)} />
        </div>
      </div>

      <Button variant="gold" disabled={busy} onClick={save}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
