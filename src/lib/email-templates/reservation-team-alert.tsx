import * as React from 'react'
import { Hr, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailShell,
  card,
  h1,
  langRule,
  lead,
  rowLabel,
  rowValue,
  securityNote,
  securityText,
} from './brand'

interface ReservationTeamAlertProps {
  name?: string
  email?: string
  phone?: string
  arrival?: string
  departure?: string
  guests?: string | number
  unitLabel?: string
  message?: string
}

const Email = ({
  name = '—',
  email = '',
  phone = '',
  arrival = '',
  departure = '',
  guests = '',
  unitLabel = '',
  message = '',
}: ReservationTeamAlertProps) => (
  <EmailShell preview={`Nouvelle réservation · New booking — ${name}`}>
    <Text style={h1}>Nouvelle demande de réservation</Text>
    <Text style={lead}>
      Nouvelle demande de réservation reçue sur le site Panorama P.
    </Text>

    <Section style={card}>
      <Text style={rowLabel}>Client · Name</Text>
      <Text style={rowValue}>{name || '—'}</Text>
      <Text style={rowLabel}>Téléphone · Phone</Text>
      <Text style={rowValue}>{phone || '—'}</Text>
      <Text style={rowLabel}>Email</Text>
      <Text style={rowValue}>{email || '—'}</Text>
      <Text style={rowLabel}>Type de logement · Accommodation type</Text>
      <Text style={rowValue}>{unitLabel || '—'}</Text>
      <Text style={rowLabel}>Nombre de personnes · Guests</Text>
      <Text style={rowValue}>{guests || '—'}</Text>
      <Text style={rowLabel}>Arrivée · Check-in</Text>
      <Text style={rowValue}>{arrival || '—'}</Text>
      <Text style={rowLabel}>Départ · Check-out</Text>
      <Text style={rowValue}>{departure || '—'}</Text>
      {message ? (
        <>
          <Text style={rowLabel}>Message</Text>
          <Text style={rowValue}>{message}</Text>
        </>
      ) : null}
    </Section>

    <Hr style={langRule} />

    <Section style={securityNote}>
      <Text style={securityText}>
        Action requise : Validation de la réservation. · Action required:
        confirm the booking.
      </Text>
    </Section>
  </EmailShell>
)

export const template = {
  component: Email,
  subject: 'Nouvelle réservation · Panorama P Residence',
  displayName: 'Reservation team alert',
  previewData: {
    name: 'Awa N.',
    email: 'awa@example.com',
    phone: '+237 6 90 00 00 00',
    arrival: '2026-07-12',
    departure: '2026-07-16',
    guests: 2,
    unitLabel: 'Appartement Confort — Vue jardin',
    message: 'Arrivée tardive prévue vers 22h.',
  },
} satisfies TemplateEntry

export default Email
