import * as React from 'react'
import { Hr, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailShell,
  card,
  enLabel,
  h1,
  langRule,
  lead,
  paragraph,
  rowLabel,
  rowValue,
  securityNote,
  securityText,
} from './brand'

interface ReservationConfirmationProps {
  name?: string
  arrival?: string
  departure?: string
  guests?: string | number
  unitLabel?: string
}

const Email = ({
  name = 'cher client',
  arrival = '',
  departure = '',
  guests = '',
  unitLabel = '',
}: ReservationConfirmationProps) => (
  <EmailShell preview="Demande de réservation reçue · Reservation request received — Panorama P Residence">
    {/* Français */}
    <Text style={h1}>Bonjour {name},</Text>
    <Text style={lead}>
      Nous avons bien reçu votre demande de réservation à la Résidence
      Panorama P.
    </Text>
    <Text style={paragraph}>
      Votre demande est actuellement en cours d'étude par notre équipe. Nous
      vous contacterons très prochainement pour confirmation.
    </Text>

    <Section style={card}>
      {unitLabel ? (
        <>
          <Text style={rowLabel}>Type de logement · Accommodation</Text>
          <Text style={rowValue}>{unitLabel}</Text>
        </>
      ) : null}
      <Text style={rowLabel}>Arrivée · Check-in</Text>
      <Text style={rowValue}>{arrival || '—'}</Text>
      <Text style={rowLabel}>Départ · Check-out</Text>
      <Text style={rowValue}>{departure || '—'}</Text>
      <Text style={rowLabel}>Voyageurs · Guests</Text>
      <Text style={rowValue}>{guests || '—'}</Text>
    </Section>

    <Section style={securityNote}>
      <Text style={securityText}>
        Merci pour votre confiance.
        <br />
        Résidence Panorama P — Bafoussam
      </Text>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Hello {name},</Text>
    <Text style={paragraph}>
      We have received your reservation request at Résidence Panorama P. Your
      request is currently being reviewed by our team. We will contact you very
      soon to confirm.
    </Text>
    <Text style={paragraph}>
      Thank you for your trust.
      <br />
      Résidence Panorama P — Bafoussam
    </Text>
  </EmailShell>
)

export const template = {
  component: Email,
  subject:
    'Demande reçue — en attente de validation · Panorama P Residence',
  displayName: 'Reservation confirmation',
  previewData: {
    name: 'Awa N.',
    arrival: '12 juillet 2026 · 14:00',
    departure: '16 juillet 2026 · 11:00',
    guests: 2,
    unitLabel: 'Appartement Premium',
  },
} satisfies TemplateEntry

export default Email
