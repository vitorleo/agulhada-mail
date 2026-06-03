import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text
} from "react-email";
import React from "react";
import { emailAssets } from "../assets.js";

type EmailLayoutProps = {
  preview: string;
  recipientEmail?: string;
  unsubscribeUrl?: string;
  footerReason?: string;
  children: React.ReactNode;
};

export function EmailLayout({
  preview,
  recipientEmail,
  unsubscribeUrl,
  footerReason = "Voce recebeu este email porque se cadastrou no Agulhada.com.",
  children
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Img
          src={emailAssets.logoUrl}
          width="220"
          alt="Agulhada.com"
          style={styles.logo}
        />
        <Container style={styles.container}>{children}</Container>
        <Container style={styles.footerContainer}>
          <Hr style={styles.hr} />
          <Section>
            <Row>
              <Column style={styles.footerColumn}>
                <Text style={styles.footerText}>{footerReason}</Text>
                {recipientEmail ? <Text style={styles.footerText}>Email enviado para {recipientEmail}</Text> : null}
                {unsubscribeUrl ? <Link href={unsubscribeUrl} style={styles.footerLink}>Descadastrar</Link> : null}
              </Column>
            </Row>
          </Section>
          <Text style={styles.address}>{emailAssets.postalAddress}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#fafbfb",
    color: "#111827",
    fontFamily: "Arial, sans-serif",
    fontSize: "16px",
    margin: 0,
    padding: "20px 0"
  },
  logo: {
    display: "block",
    margin: "20px auto"
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "6px",
    margin: "0 auto",
    maxWidth: "600px",
    padding: "28px"
  },
  footerContainer: {
    margin: "20px auto 0",
    maxWidth: "600px"
  },
  footerColumn: {
    padding: "0 20px"
  },
  footerText: {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "6px 0"
  },
  footerLink: {
    color: "#2250f4",
    fontSize: "13px"
  },
  address: {
    color: "#9ca3af",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "14px 0 20px",
    textAlign: "center" as const
  },
  hr: {
    borderColor: "#e5e7eb",
    margin: "16px 0"
  }
};
