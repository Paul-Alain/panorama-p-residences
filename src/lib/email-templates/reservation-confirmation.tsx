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
    <Text style={h1}>Merci, {name} !</Text>
    <Text style={lead}>
      Nous avons bien reçu votre demande de réservation à Panorama P Residence.
      Voici le récapitulatif de votre séjour :
    </Text>

    <Section style={card}>
      {unitLabel ? (
        <>
          <Text style={rowLabel}>Logement · Accommodation</Text>
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
        Notre équipe vous contactera très prochainement pour confirmer la
        disponibilité et finaliser votre réservation.
      </Text>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Thank you, {name}!</Text>
    <Text style={paragraph}>
      We've received your reservation request at Panorama P Residence. Our team
      will reach out shortly to confirm availability and finalise your booking.
    </Text>
  </EmailShell>
)

export const template = {
  component: Email,
  subject: 'Votre demande de réservation · Panorama P Residence',
  displayName: 'Reservation confirmation',
  previewData: {
    name: 'Awa N.',
    arrival: '2026-07-12',
    departure: '2026-07-16',
    guests: 2,
    unitLabel: 'Appartement Confort — Vue jardin',
  },
} satisfies TemplateEntry

export default Email
