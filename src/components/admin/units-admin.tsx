import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/i18n/language-context";
import { logementsQuery } from "@/lib/data";
import {
  adminListUnits,
  adminCreateUnit,
  adminUpdateUnit,
  adminDeleteUnit,
} from "@/lib/admin.functions";

interface Unit {
  id: string;
  logement_id: string;
  label: string;
  unit_number: number;
  available: boolean;
  sort_order: number;
  type: string;
  category_title: string;
}

const CATEGORY_ORDER = ["chambre", "studio", "appartement"];

export function UnitsAdmin() {
  const { t } = useLanguage();
  const u = t.admin.dash.units;
  const qc = useQueryClient();
  const runList = useServerFn(adminListUnits);
  const runCreate = useServerFn(adminCreateUnit);
  const runUpdate = useServerFn(adminUpdateUnit);
  const runDelete = useServerFn(adminDeleteUnit);

  const { data: logements = [] } = useQuery(logementsQuery);
  const { data: units = [], isLoading } = useQuery({
    queryKey: ["admin-units"],
    queryFn: async () => (await runList()) as Unit[],
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [label, setLabel] = useState("");
  const [unitNumber, setUnitNumber] = useState("1");
  const [logementId, setLogementId] = useState("");
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-units"] });
    qc.invalidateQueries({ queryKey: ["logement-units"] });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const it of units) {
      if (!map.has(it.type)) map.set(it.type, []);
      map.get(it.type)!.push(it);
    }
    return Array.from(map.entries()).sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
    );
  }, [units]);

  const openAdd = () => {
    setEditing(null);
    setLabel("");
    setUnitNumber(String(units.length + 1));
    setLogementId(logements[0]?.id ?? "");
    setAvailable(true);
    setOpen(true);
  };

  const openEdit = (it: Unit) => {
    setEditing(it);
    setLabel(it.label);
    setUnitNumber(String(it.unit_number));
    setLogementId(it.logement_id);
    setAvailable(it.available);
    setOpen(true);
  };

  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await runUpdate({
          data: {
            id: editing.id,
            label: label.trim(),
            unit_number: Number(unitNumber) || 1,
            available,
          },
        });
      } else {
        await runCreate({
          data: {
            logement_id: logementId,
            label: label.trim(),
            unit_number: Number(unitNumber) || 1,
            available,
            sort_order: units.length + 1,
          },
        });
      }
      toast.success(u.saved);
      setOpen(false);
      refresh();
    } catch {
      toast.error("Erreur");
    }
    setSaving(false);
  };

  const toggle = async (it: Unit) => {
    setTogglingId(it.id);
    try {
      await runUpdate({ data: { id: it.id, available: !it.available } });
      refresh();
    } catch {
      toast.error("Erreur");
    }
    setTogglingId(null);
  };

  const remove = async (id: string) => {
    try {
      await runDelete({ data: { id } });
      toast.success(u.deleted);
      refresh();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{u.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{u.subtitle}</p>
        </div>
        <Button variant="gold" onClick={openAdd}>
          <Plus className="h-4 w-4" /> {u.add}
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      ) : units.length === 0 ? (
        <p className="text-muted-foreground">{u.empty}</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([type, list]) => (
            <div key={type} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {list[0]?.category_title || type}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{it.label}</p>
                        <Badge variant={it.available ? "secondary" : "destructive"}>
                          {it.available ? u.available : u.unavailable}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Switch
                          checked={it.available}
                          disabled={togglingId === it.id}
                          onCheckedChange={() => toggle(it)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {u.available}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(it)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{u.deleteTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{u.deleteDesc}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{u.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(it.id)}>
                              {u.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? u.edit : u.add}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{u.label}</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{u.unitNumber}</Label>
                <Input
                  type="number"
                  min={1}
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                />
              </div>
              {!editing && (
                <div className="space-y-1.5">
                  <Label>{u.category}</Label>
                  <Select value={logementId} onValueChange={setLogementId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {logements.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.title_fr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={available} onCheckedChange={setAvailable} />
              <span className="text-sm">{u.available}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {u.cancel}
            </Button>
            <Button variant="gold" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {u.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
