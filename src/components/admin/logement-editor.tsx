import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Logement } from "@/lib/data";

type Draft = Omit<Logement, "id"> & { id?: string };

const empty: Draft = {
  type: "studio",
  title_fr: "",
  title_de: "",
  title_en: "",
  description_fr: "",
  description_de: "",
  description_en: "",
  price: 0,
  currency: "FCFA",
  price_unit: "nuit",
  equipments: [],
  images: [],
  available: true,
  sort_order: 0,
};

export function LogementEditor({
  open,
  onOpenChange,
  logement,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  logement: Logement | null;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(logement ? { ...logement } : empty);
  }, [logement, open]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    if (!draft.title_fr.trim()) {
      toast.error("Le titre (FR) est requis.");
      return;
    }
    setSaving(true);
    const payload = {
      type: draft.type,
      title_fr: draft.title_fr,
      title_de: draft.title_de,
      title_en: draft.title_en,
      description_fr: draft.description_fr,
      description_de: draft.description_de,
      description_en: draft.description_en,
      price: Number(draft.price) || 0,
      currency: draft.currency,
      price_unit: draft.price_unit,
      equipments: draft.equipments,
      images: draft.images,
      available: draft.available,
      sort_order: Number(draft.sort_order) || 0,
    };
    const { error } = draft.id
      ? await supabase.from("logements").update(payload).eq("id", draft.id)
      : await supabase.from("logements").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Logement enregistré.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Modifier le logement" : "Nouveau logement"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={draft.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="chambre">Chambre</SelectItem>
                  <SelectItem value="appartement">Appartement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prix</Label>
              <Input
                type="number"
                value={draft.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ordre</Label>
              <Input
                type="number"
                value={draft.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Titre (FR)" value={draft.title_fr} onChange={(v) => set("title_fr", v)} />
            <TextField label="Titre (DE)" value={draft.title_de ?? ""} onChange={(v) => set("title_de", v)} />
            <TextField label="Titre (EN)" value={draft.title_en ?? ""} onChange={(v) => set("title_en", v)} />
          </div>

          <AreaField label="Description (FR)" value={draft.description_fr ?? ""} onChange={(v) => set("description_fr", v)} />
          <AreaField label="Description (DE)" value={draft.description_de ?? ""} onChange={(v) => set("description_de", v)} />
          <AreaField label="Description (EN)" value={draft.description_en ?? ""} onChange={(v) => set("description_en", v)} />

          <TextField
            label="Équipements (séparés par des virgules)"
            value={draft.equipments.join(", ")}
            onChange={(v) => set("equipments", v.split(",").map((s) => s.trim()).filter(Boolean))}
          />
          <TextField
            label="Images (identifiants ou URLs, séparés par des virgules)"
            value={draft.images.join(", ")}
            onChange={(v) => set("images", v.split(",").map((s) => s.trim()).filter(Boolean))}
          />

          <div className="flex items-center gap-3">
            <Switch checked={draft.available} onCheckedChange={(c) => set("available", c)} />
            <Label>Disponible</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button variant="gold" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
