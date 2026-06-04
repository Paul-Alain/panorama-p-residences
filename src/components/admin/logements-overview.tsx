import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LogementEditor } from "@/components/admin/logement-editor";
import { logementsQuery, formatPrice, type Logement } from "@/lib/data";
import { opGetDashboard, opSetUnitOpStatus } from "@/lib/operations.functions";
import { adminUpdateUnit } from "@/lib/admin.functions";
import {
  UNIT_STATUS_LABELS,
  OP_STATUS_LABELS,
  statusFillClass,
  type UnitStatus,
} from "@/lib/operations";

const CAPACITY: Record<string, number> = { chambre: 2, studio: 2, appartement: 4 };

export function LogementsOverview() {
  const qc = useQueryClient();
  const runDash = useServerFn(opGetDashboard);
  const runUpdateUnit = useServerFn(adminUpdateUnit);
  const runOp = useServerFn(opSetUnitOpStatus);

  const [editing, setEditing] = useState<Logement | null>(null);
  const [open, setOpen] = useState(false);

  const { data: logements = [], isLoading: lLoading } = useQuery(logementsQuery);
  const { data: dash, isLoading: uLoading } = useQuery({
    queryKey: ["op-dashboard"],
    queryFn: () => runDash(),
    staleTime: 30_000,
  });

  const units = dash?.units ?? [];
  const unitsByType = (type: string) => units.filter((u) => u.type === type).length;

  const refreshLogements = () => qc.invalidateQueries({ queryKey: ["logements"] });
  const refreshUnits = () => qc.invalidateQueries({ queryKey: ["op-dashboard"] });

  const toggleActive = async (id: string, available: boolean) => {
    try {
      await runUpdateUnit({ data: { id, available } });
      await refreshUnits();
      toast.success(available ? "Unité visible à la réservation." : "Unité masquée du site.");
    } catch {
      toast.error("Erreur");
    }
  };

  const setOp = async (unitId: string, opStatus: "actif" | "nettoyage" | "maintenance" | "bloquee") => {
    try {
      await runOp({ data: { unitId, opStatus } });
      await refreshUnits();
      toast.success("Statut mis à jour.");
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="space-y-10">
      {/* Types */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Types de logements</h2>
          <Button variant="gold" size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
        {lLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {logements.map((l) => (
              <div key={l.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between">
                  <p className="font-medium">{l.title_fr}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(l); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Capacité {CAPACITY[l.type] ?? 2} personne(s)
                </p>
                <p className="text-sm">{formatPrice(l.price, l.currency)} / {l.price_unit}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary">{unitsByType(l.type)} unité(s)</Badge>
                  <Badge variant={l.available ? "default" : "outline"}>{l.available ? "Actif" : "Inactif"}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Physical units */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Unités physiques</h2>
        {uLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {units.map((u) => (
              <div key={u.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{u.label}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusFillClass(u.status as UnitStatus)}`}>
                    {UNIT_STATUS_LABELS[u.status as UnitStatus]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  État opérationnel : {OP_STATUS_LABELS[u.opStatus] ?? u.opStatus}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["actif", "nettoyage", "maintenance", "bloquee"] as const).map((o) => (
                    <Button
                      key={o}
                      size="sm"
                      variant={u.opStatus === o ? "gold" : "outline"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setOp(u.id, o)}
                    >
                      {OP_STATUS_LABELS[o]}
                    </Button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                  <span className="text-sm">Visible à la réservation</span>
                  <Switch checked={u.available} onCheckedChange={(v) => toggleActive(u.id, v)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <LogementEditor open={open} onOpenChange={setOpen} logement={editing} onSaved={refreshLogements} />
    </div>
  );
}
