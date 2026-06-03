import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";

export function ContactForm() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("messages").insert({
      name: form.name.trim().slice(0, 120),
      phone: form.phone.trim().slice(0, 40) || null,
      email: form.email.trim().slice(0, 160) || null,
      message: form.message.trim().slice(0, 2000),
      user_id: user?.id ?? null,
    });
    setLoading(false);
    if (error) {
      toast.error(t.contact.error);
      return;
    }
    // Fire-and-forget branded confirmation email (only when an address is given).
    const confirmEmail = form.email.trim();
    if (confirmEmail) {
      fetch("/api/public/email/contact-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: confirmEmail, name: form.name.trim() }),
      }).catch(() => {});
    }
    toast.success(t.contact.success);
    setForm({ name: "", phone: "", email: "", message: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">
            {t.contact.name}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id="c-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-phone">{t.contact.phone}</Label>
          <Input
            id="c-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={40}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-email">{t.contact.email}</Label>
        <Input
          id="c-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          maxLength={160}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-message">
          {t.contact.message}
          <span className="text-destructive"> *</span>
        </Label>
        <Textarea
          id="c-message"
          rows={5}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          required
          maxLength={2000}
        />
      </div>

      <Button type="submit" variant="gold" size="lg" disabled={loading} className="w-full sm:w-auto">
        <Send className="h-5 w-5" />
        {loading ? t.contact.sending : t.contact.send}
      </Button>
    </form>
  );
}
