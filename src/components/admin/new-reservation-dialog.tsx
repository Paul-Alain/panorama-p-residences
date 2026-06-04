import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminListUnits } from "@/lib/admin.functions";
import { opCreateReservation } from "@/lib/operations.functions";

const KEYS = ["op-dashboard", "admin-reservations", "op-clients", "admin-occupancy"];

export function NewReservationDialog({
  open,
  onOpenChange,
  presetUnitId,
  presetArrival,
  presetDeparture,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presetUnitId?: string | null;
  presetArrival?: string;
  presetDeparture?: string;
}) {
  const qc = useQueryClient();
  const runUnits = useServerFn(adminListUnits);
  const runCreate = useServerFn(opCreateReservation);

  const { data: units = [] } = useQuery({
    queryKey: ["admin-units"],
    queryFn: () => runUnits(),
    staleTime: 60_000,
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [unitId, setUnitId] = useState<string>("");
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [guests, setGuests] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setUnitId(presetUnitId ?? "");
      setArrival(presetArrival ?? "");
      setDeparture(presetDeparture ?? "");
    }
  }, [open, presetUnitId, presetArrival, presetDeparture]);

  const submit = async () => {
    if (!name.trim()) return toast.error("Le nom du client est obligatoire.");
    if (!phone.trim()) return toast.error("Le téléphone est obligatoire.");
    if (!unitId) return toast.error("Choisissez une unité physique.");
    if (!arrival || !departure || departure <= arrival)
      return toast.error("Dates invalides.");
    setBusy(true);
    try {
      await runCreate({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          unitId,
          arrival,
          departure,
          guests: Number(guests) || 1,
          status: "confirmée",
          notes: notes.trim() || undefined,
        },
      });
      await Promise.all(KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));
      toast.success("Réservation créée.");
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Nouvelle réservation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nom du client *" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Téléphone *" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="E-mail (facultatif)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger>
              <SelectValue placeholder="Unité physique *" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Arrivée</label>
              <Input type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Départ</label>
              <Input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Personne(s)</label>
            <Input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} />
          </div>
          <Input placeholder="Notes (facultatif)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button variant="gold" className="w-full" disabled={busy} onClick={submit}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Créer la réservation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
