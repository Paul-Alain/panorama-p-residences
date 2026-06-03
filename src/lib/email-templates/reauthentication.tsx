import * as React from 'react'
import { Hr, Section, Text } from '@react-email/components'
import {
  EmailShell,
  brand,
  enLabel,
  h1,
  langRule,
  lead,
  paragraph,
  securityNote,
  securityText,
} from './brand'

interface ReauthenticationEmailProps {
  token?: string
}

const code = {
  textAlign: 'center' as const,
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '34px',
  fontWeight: 700 as const,
  letterSpacing: '10px',
  color: brand.ink,
  backgroundColor: brand.cream,
  border: `1px solid ${brand.line}`,
  borderRadius: '12px',
  padding: '18px 0',
  margin: '4px 0 22px',
}

export const ReauthenticationEmail = ({
  token = '000000',
}: ReauthenticationEmailProps) => (
  <EmailShell preview="Votre code de vérification · Your verification code — Panorama P Residence">
    {/* Français */}
    <Text style={h1}>Votre code de vérification</Text>
    <Text style={lead}>
      Utilisez le code ci-dessous pour confirmer votre identité.
    </Text>
    <Text style={code}>{token}</Text>
    <Section style={securityNote}>
      <Text style={securityText}>
        Sécurité : ce code expire rapidement. Si vous n'êtes pas à l'origine de
        cette demande, ignorez cet e-mail.
      </Text>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Your verification code</Text>
    <Text style={paragraph}>
      Use the code above to confirm your identity. It expires shortly — if you
      didn't request this, you can safely ignore this email.
    </Text>
  </EmailShell>
)

export default ReauthenticationEmail
