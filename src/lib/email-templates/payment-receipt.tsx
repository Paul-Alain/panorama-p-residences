import * as React from 'react'
import { Hr, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailShell,
  brand,
  card,
  h1,
  lead,
  rowLabel,
  rowValue,
  langRule,
} from './brand'

interface PaymentReceiptProps {
  name?: string
  amount?: string
  date?: string
  reference?: string
  method?: string
  balance?: string
}

const amountBox = {
  backgroundColor: brand.white,
  border: `1px solid ${brand.gold}`,
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '6px 0 22px',
  textAlign: 'center' as const,
}

const amountText = {
  margin: 0,
  color: brand.ink,
  fontSize: '26px',
  fontWeight: 700 as const,
}

const Email = ({
  name = 'cher client',
  amount = '—',
  date = '—',
  reference = '—',
  method = '—',
  balance = '0 FCFA',
}: PaymentReceiptProps) => (
  <EmailShell preview="Confirmation de paiement · Résidence Panorama P">
    <Text style={h1}>Bonjour {name},</Text>
    <Text style={lead}>
      Nous confirmons la bonne réception de votre paiement pour votre séjour à la
      Résidence Panorama P.
    </Text>

    <Section style={amountBox}>
      <Text style={amountText}>{amount}</Text>
    </Section>

    <Section style={card}>
      <Text style={rowLabel}>Date du paiement</Text>
      <Text style={rowValue}>{date}</Text>
      <Hr style={langRule} />
      <Text style={rowLabel}>Réservation</Text>
      <Text style={rowValue}>{reference}</Text>
      <Hr style={langRule} />
      <Text style={rowLabel}>Méthode</Text>
      <Text style={rowValue}>{method}</Text>
      <Hr style={langRule} />
      <Text style={rowLabel}>Solde restant</Text>
      <Text style={rowValue}>{balance}</Text>
    </Section>

    <Text style={lead}>
      Merci de votre confiance. Pour toute question, répondez simplement à cet
      e-mail.
    </Text>
  </EmailShell>
)

export const template = {
  component: Email,
  subject: 'Confirmation de paiement · Résidence Panorama P',
  displayName: 'Reçu de paiement',
  previewData: {
    name: 'Marie K.',
    amount: '25 000 FCFA',
    date: 'jeu 05 nov 2026',
    reference: 'RP-8F3A',
    method: 'Espèces',
    balance: '20 000 FCFA',
  },
} satisfies TemplateEntry

export default Email
