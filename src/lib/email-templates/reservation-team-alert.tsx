import * as React from 'react'
import { Hr, Section, Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailShell, card, h1, langRule, lead,
  rowLabel, rowValue, securityNote, securityText,
} from './brand'

interface ReservationTeamAlertProps {
  name?: string
  email?: string
  phone?: string
  logementType?: string
  arrival?: string
  arrivalTime?: string
  departure?: string
  departureTime?: string
  guests?: string | number
  channel?: string
  message?: string
  adminUrl?: string
}

const CHANNEL_LABELS: Record<string, string> = {
  website:  'Site web',
  whatsapp: 'WhatsApp',
  phone:    'Téléphone',
  walkin:   'Sur place',
}

const TYPE_LABELS: Record<string, string> = {
  chambre:     'Chambre meublée',
  studio:      'Studio meublé',
  appartement: 'Appartement meublé',
}

const Email = ({
  name = '—',
  email = '',
  phone = '',
  logementType = '',
  arrival = '',
  arrivalTime = '14:00',
  departure = '',
  departureTime = '11:00',
  guests = '',
  channel = 'website',
  message = '',
  adminUrl = 'https://panorama-p-residence.com/admin',
}: ReservationTeamAlertProps) => (
  <EmailShell preview={`⚡ Nouvelle réservation en attente — ${name} · Panorama P`}>

    {/* Objet clair */}
    <Text style={h1}>⚡ Nouvelle demande de réservation</Text>
    <Text style={lead}>
      Une nouvelle demande vient d'être soumise sur le site <strong>Panorama P Résidences</strong>.
      Elle est actuellement <strong>en attente de votre confirmation</strong>.
    </Text>

    {/* Résumé client */}
    <Section style={card}>
      <Text style={{ ...rowLabel, fontWeight: 700, fontSize: 13 }}>👤 INFORMATIONS CLIENT</Text>
      <Text style={rowLabel}>Nom complet</Text>
      <Text style={rowValue}>{name}</Text>
      <Text style={rowLabel}>Téléphone</Text>
      <Text style={rowValue}>{phone || '—'}</Text>
      <Text style={rowLabel}>Email</Text>
      <Text style={rowValue}>{email || '—'}</Text>
      <Text style={rowLabel}>Canal de réservation</Text>
      <Text style={rowValue}>{CHANNEL_LABELS[channel] ?? channel}</Text>
    </Section>

    {/* Détails séjour */}
    <Section style={{ ...card, marginTop: 12 }}>
      <Text style={{ ...rowLabel, fontWeight: 700, fontSize: 13 }}>🏠 DÉTAILS DU SÉJOUR</Text>
      <Text style={rowLabel}>Type de logement</Text>
      <Text style={rowValue}>{TYPE_LABELS[logementType] ?? (logementType || '—')}</Text>
      <Text style={rowLabel}>Nombre de personnes</Text>
      <Text style={rowValue}>{guests || '—'}</Text>
      <Text style={rowLabel}>Date d'arrivée</Text>
      <Text style={rowValue}>{arrival} à {arrivalTime} (heure de Yaoundé)</Text>
      <Text style={rowLabel}>Date de départ</Text>
      <Text style={rowValue}>{departure} à {departureTime} (heure de Yaoundé)</Text>
      {message ? (
        <>
          <Text style={rowLabel}>Message du client</Text>
          <Text style={rowValue}>{message}</Text>
        </>
      ) : null}
    </Section>

    <Hr style={langRule} />

    {/* Call to action */}
    <Section style={securityNote}>
      <Text style={{ ...securityText, fontWeight: 700 }}>
        ⚠️ Action requise : Veuillez vous connecter au tableau de bord pour confirmer ou rejeter cette réservation.
      </Text>
    </Section>

    <Section style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button
        href={adminUrl}
        style={{
          backgroundColor: '#92400e',
          color: '#fff',
          borderRadius: 8,
          padding: '14px 32px',
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          display: 'inline-block',
          border: '2px solid #000',
        }}>
        🔐 Accéder au tableau de bord
      </Button>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={{ ...h1, fontSize: 18 }}>⚡ New booking request pending</Text>
    <Text style={lead}>
      A new reservation request has been submitted on <strong>Panorama P Residences</strong> website.
      It is currently <strong>awaiting your confirmation</strong>.
    </Text>
    <Text style={securityText}>
      ⚠️ Action required: Please log in to the dashboard to confirm or reject this booking.
    </Text>

  </EmailShell>
)

export const template = {
  component: Email,
  subject: (d: any) => `⚡ Nouvelle réservation en attente — ${d.name ?? 'Client'} · Panorama P`,
  displayName: 'Alerte réservation équipe',
  previewData: {
    name: 'Marie Nguyen',
    email: 'marie@example.com',
    phone: '+237 6 55 86 24 05',
    logementType: 'studio',
    arrival: '2026-07-12',
    arrivalTime: '14:00',
    departure: '2026-07-16',
    departureTime: '11:00',
    guests: 2,
    channel: 'website',
    message: 'Arrivée tardive prévue vers 22h.',
    adminUrl: 'https://panorama-p-residence.com/admin',
  },
} satisfies TemplateEntry

export default Email
