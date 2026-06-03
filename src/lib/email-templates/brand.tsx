import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

/**
 * Shared Panorama P Residence email brand kit.
 * Luxury hospitality look: gold #C8A45D, white, elegant dark accents.
 * Every email uses <EmailShell> so the header, signature and footer stay
 * perfectly consistent across auth and transactional emails.
 */

export const brand = {
  name: 'Panorama P Residence',
  gold: '#C8A45D',
  goldSoft: '#EBD9B4',
  ink: '#1A1714',
  inkSoft: '#4A443C',
  muted: '#8B8378',
  line: '#E7E0D4',
  cream: '#FBF8F2',
  white: '#FFFFFF',
  city: 'Bafoussam, Cameroon',
  reservationsEmail: 'reservations@panorama-p-residence.com',
  siteUrl: 'https://panorama-p-residence.com',
  // Absolute CDN URL so the logo renders in every email client.
  logoUrl:
    'https://panorama-p-residence.com/__l5e/assets-v1/ef93b42b-5431-46cf-a49b-9990ec0c6ac8/logo-panorama-p.png',
} as const

export const main = {
  backgroundColor: '#ffffff',
  margin: 0,
  padding: '0',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
}

const outerWrap = {
  backgroundColor: brand.cream,
  padding: '32px 0',
}

const container = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: brand.white,
  borderRadius: '16px',
  overflow: 'hidden' as const,
  border: `1px solid ${brand.line}`,
}

const header = {
  backgroundColor: brand.ink,
  padding: '32px 24px 26px',
  textAlign: 'center' as const,
}

const headerRule = {
  width: '46px',
  height: '2px',
  backgroundColor: brand.gold,
  margin: '14px auto 0',
  border: 'none',
}

const brandName = {
  margin: '14px 0 0',
  color: brand.white,
  fontSize: '20px',
  letterSpacing: '3px',
  fontWeight: 600 as const,
  textTransform: 'uppercase' as const,
}

const brandTagline = {
  margin: '6px 0 0',
  color: brand.goldSoft,
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
}

const content = {
  padding: '34px 36px 8px',
}

const sigWrap = {
  padding: '8px 36px 30px',
  textAlign: 'center' as const,
}

const sigRule = {
  width: '100%',
  borderTop: `1px solid ${brand.line}`,
  margin: '12px 0 22px',
}

const sigName = {
  margin: '14px 0 0',
  color: brand.ink,
  fontSize: '15px',
  fontWeight: 700 as const,
  letterSpacing: '0.5px',
}

const sigLine = {
  margin: '4px 0 0',
  color: brand.muted,
  fontSize: '13px',
  lineHeight: '20px',
}

const sigLink = {
  color: brand.gold,
  textDecoration: 'none',
  fontWeight: 600 as const,
}

const footer = {
  backgroundColor: brand.cream,
  padding: '20px 36px 28px',
  textAlign: 'center' as const,
}

const footerText = {
  margin: '0 0 4px',
  color: brand.muted,
  fontSize: '11px',
  lineHeight: '18px',
}

/** Branded signature block — center aligned with a subtle separator line. */
export function Signature() {
  return (
    <Section style={sigWrap}>
      <Hr style={sigRule} />
      <Img
        src={brand.logoUrl}
        width="56"
        height="56"
        alt="Panorama P Residence"
        style={{ margin: '0 auto', display: 'block', borderRadius: '10px' }}
      />
      <Text style={sigName}>Panorama P Residence</Text>
      <Text style={sigLine}>{brand.city}</Text>
      <Text style={sigLine}>
        <Link href={`mailto:${brand.reservationsEmail}`} style={sigLink}>
          {brand.reservationsEmail}
        </Link>
      </Text>
    </Section>
  )
}

/**
 * Full email shell: cream backdrop, white card, dark header with logo,
 * children content, signature and footer. Body background stays #ffffff.
 */
export function EmailShell({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Section style={outerWrap}>
          <Container style={container}>
            <Section style={header}>
              <Img
                src={brand.logoUrl}
                width="64"
                height="64"
                alt="Panorama P Residence"
                style={{ margin: '0 auto', display: 'block', borderRadius: '12px' }}
              />
              <Text style={brandName}>Panorama P</Text>
              <Text style={brandTagline}>Residence &middot; Bafoussam</Text>
              <Hr style={headerRule} />
            </Section>

            <Section style={content}>{children}</Section>

            <Signature />

            <Section style={footer}>
              <Text style={footerText}>
                Panorama P Residence &middot; {brand.city}
              </Text>
              <Text style={footerText}>
                <Link href={brand.siteUrl} style={{ color: brand.muted }}>
                  panorama-p-residence.com
                </Link>
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  )
}

/* ---- Reusable content primitives (shared styles for all templates) ---- */

export const h1 = {
  margin: '0 0 6px',
  color: brand.ink,
  fontSize: '23px',
  lineHeight: '30px',
  fontWeight: 700 as const,
}

export const lead = {
  margin: '0 0 18px',
  color: brand.inkSoft,
  fontSize: '15px',
  lineHeight: '24px',
}

export const paragraph = {
  margin: '0 0 16px',
  color: brand.inkSoft,
  fontSize: '14px',
  lineHeight: '23px',
}

export const enLabel = {
  margin: '0 0 6px',
  color: brand.gold,
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  fontWeight: 700 as const,
}

export const langRule = {
  borderTop: `1px solid ${brand.line}`,
  margin: '24px 0',
}

export const ctaWrap = {
  textAlign: 'center' as const,
  margin: '8px 0 24px',
}

export const button = {
  backgroundColor: brand.gold,
  color: brand.ink,
  fontSize: '14px',
  fontWeight: 700 as const,
  letterSpacing: '0.5px',
  borderRadius: '10px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  textTransform: 'uppercase' as const,
}

export const securityNote = {
  backgroundColor: brand.cream,
  borderLeft: `3px solid ${brand.gold}`,
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '4px 0 20px',
}

export const securityText = {
  margin: 0,
  color: brand.inkSoft,
  fontSize: '13px',
  lineHeight: '20px',
}

export const linkFallback = {
  margin: '0 0 18px',
  color: brand.muted,
  fontSize: '12px',
  lineHeight: '19px',
  wordBreak: 'break-all' as const,
}

/* Detail rows used by reservation / receipt style emails */
export const card = {
  backgroundColor: brand.cream,
  border: `1px solid ${brand.line}`,
  borderRadius: '12px',
  padding: '6px 18px',
  margin: '6px 0 22px',
}

export const rowLabel = {
  color: brand.muted,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  padding: '10px 0 2px',
  margin: 0,
}

export const rowValue = {
  color: brand.ink,
  fontSize: '15px',
  fontWeight: 600 as const,
  margin: '0 0 8px',
}
