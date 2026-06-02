import { Heading, Link, Section, Text } from "@react-email/components";
import React from "react";
import { emailAssets } from "../assets.js";
import { EmailButton } from "../components/EmailButton.js";
import { EmailLayout } from "../components/EmailLayout.js";
import type { ReactEmailTemplateProps } from "../types.js";

export default function Welcome({ data }: ReactEmailTemplateProps) {
  const name = stringValue(data.firstName) || stringValue(data.name);

  return (
    <EmailLayout
      preview="Boas-vindas do Agulhada.com"
      recipientEmail={stringValue(data.email)}
      footerReason="Voce recebeu este email porque e usuario registrado no Agulhada.com."
    >
      <Heading style={styles.heading}>Bem-vindo ao Agulhada.com</Heading>
      <Text style={styles.text}>{name ? `Ola ${name},` : "Ola,"}</Text>
      <Text style={styles.text}>
        Parabens! Voce se juntou a usuarios no Brasil e no mundo que usam o Agulhada.com para receber alertas e
        encontrar oportunidades de trade.
      </Text>
      <Text style={styles.text}>Veja como aproveitar melhor a plataforma:</Text>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          <strong>Aprenda a usar o Agulhada.com:</strong>{" "}
          <Link href={emailAssets.youtubeUrl}>assine nosso canal no YouTube</Link> e assista aos tutoriais.
        </li>
        <li style={styles.listItem}>
          <strong>Acione o robo de alertas no Telegram:</strong> procure por{" "}
          <Link href={emailAssets.telegramBotUrl}>@Agulhadacom_bot</Link> no Telegram.
        </li>
        <li style={styles.listItem}>
          <strong>Encontre outros usuarios:</strong> troque ideias no{" "}
          <Link href={emailAssets.telegramGroupUrl}>grupo de usuarios</Link> do Agulhada.com.
        </li>
        <li style={styles.listItem}>
          <strong>Entre em contato:</strong> em caso de duvidas, sugestoes ou problemas, envie um email para{" "}
          <Link href={`mailto:${emailAssets.supportEmail}`}>{emailAssets.supportEmail}</Link>.
        </li>
      </ul>
      <Section style={styles.cta}>
        <EmailButton href={emailAssets.loginUrl}>Entrar no Agulhada.com</EmailButton>
      </Section>
    </EmailLayout>
  );
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const styles = {
  heading: {
    fontSize: "26px",
    lineHeight: "34px",
    margin: "0 0 20px",
    textAlign: "center" as const
  },
  text: {
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px"
  },
  list: {
    margin: "0 0 22px",
    paddingLeft: "22px"
  },
  listItem: {
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "14px"
  },
  cta: {
    textAlign: "center" as const
  }
};
