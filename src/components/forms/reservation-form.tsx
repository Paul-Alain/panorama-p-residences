import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";
import { whatsappLink } from "@/lib/site-config";

export function ReservationForm({ defaultType = "" }: { defaultType?: string }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    arrival: "",
    departure: "",
    guests: "1",
    type: defaultType,
    message: "",
  });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const typeLabel: Record<string, string> = {
    studio: t.logements.types.studio,
    chambre: t.logements.types.chambre,
    appartement: t.logements.types.appartement,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.arrival || !form.departure)
      return;
    if (new Date(form.departure) <= new Date(form.arrival)) {
      toast.error(t.reservation.dateError);
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reservations").insert({
      name: form.name.trim().slice(0, 120),
      phone: form.phone.trim().slice(0, 40),
      email: form.email.trim().slice(0, 160) || null,
      arrival_date: form.arrival,
      departure_date: form.departure,
      guests: Number(form.guests) || 1,
      logement_type: form.type || null,
      message: form.message.trim().slice(0, 1000) || null,
      user_id: user?.id ?? null,
    });
    setLoading(false);
    if (error) {
      toast.error(t.reservation.error);
      return;
    }
    toast.success(t.reservation.success);
    setForm({
      name: "",
      phone: "",
      email: "",
      arrival: "",
      departure: "",
      guests: "1",
      type: defaultType,
      message: "",
    });
  };

  const waMessage = `Bonjour Panorama P,%0A${t.reservation.title}:%0A- ${form.name}%0A- ${form.arrival} → ${form.departure}%0A- ${form.guests} pers.%0A- ${form.type}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-name">{t.reservation.name}</Label>
          <Input
            id="r-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-phone">{t.reservation.phone}</Label>
          <Input
            id="r-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
            maxLength={40}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-email">{t.reservation.email}</Label>
        <Input
          id="r-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          maxLength={160}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-arrival">{t.reservation.arrival}</Label>
          <Input
            id="r-arrival"
            type="date"
            value={form.arrival}
            onChange={(e) => set("arrival", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-departure">{t.reservation.departure}</Label>
          <Input
            id="r-departure"
            type="date"
            value={form.departure}
            onChange={(e) => set("departure", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-guests">{t.reservation.guests}</Label>
          <Input
            id="r-guests"
            type="number"
            min={1}
            max={20}
            value={form.guests}
            onChange={(e) => set("guests", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t.reservation.type}</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t.reservation.typePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="studio">{typeLabel.studio}</SelectItem>
              <SelectItem value="chambre">{typeLabel.chambre}</SelectItem>
              <SelectItem value="appartement">{typeLabel.appartement}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-message">{t.reservation.message}</Label>
        <Textarea
          id="r-message"
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          maxLength={1000}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="gold" size="lg" disabled={loading} className="flex-1">
          <CalendarCheck className="h-5 w-5" />
          {loading ? t.reservation.submitting : t.reservation.submit}
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <a href={whatsappLink(decodeURIComponent(waMessage))} target="_blank" rel="noreferrer">
            <MessageCircle className="h-5 w-5" />
            {t.reservation.whatsappCta}
          </a>
        </Button>
      </div>
    </form>
  );
}
