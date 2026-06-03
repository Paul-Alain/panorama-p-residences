import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { LogementEditor } from "@/components/admin/logement-editor";
import { adminDeleteLogement } from "@/lib/admin.functions";
import { logementsQuery, formatPrice, type Logement } from "@/lib/data";

export function LogementsAdmin() {
  const qc = useQueryClient();
  const { data: logements = [], isLoading } = useQuery(logementsQuery);
  const [editing, setEditing] = useState<Logement | null>(null);
  const [open, setOpen] = useState(false);
  const runDeleteLogement = useServerFn(adminDeleteLogement);

  const refresh = () => qc.invalidateQueries({ queryKey: ["logements"] });

  const remove = async (id: string) => {
    try {
      await runDeleteLogement({ data: { id } });
    } catch {
      toast.error("Suppression refusée.");
      return;
    }
    toast.success("Logement supprimé.");
    refresh();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      ) : (
        <div className="space-y-3">
          {logements.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{l.title_fr}</p>
                  <Badge variant="secondary">{l.type}</Badge>
                  {!l.available && <Badge variant="destructive">Complet</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{formatPrice(l.price, l.currency)} / {l.price_unit}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="icon" onClick={() => { setEditing(l); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce logement ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(l.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
      <LogementEditor open={open} onOpenChange={setOpen} logement={editing} onSaved={refresh} />
    </div>
  );
}
