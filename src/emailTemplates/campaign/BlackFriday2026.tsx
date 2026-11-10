import { Body, Head, Html, Link, Preview, Text } from "react-email";
import React from "react";
import { emailAssets } from "../assets.js";
import type { ReactEmailTemplateProps } from "../types.js";

export default function BlackFriday2026({ data }: ReactEmailTemplateProps) {
  const name = stringValue(data.firstName) || stringValue(data.name) || "Agulheiro";

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Suas próximas agulhadas podem chegar com desconto. Aproveite até 50% OFF.</Preview>
      <Body style={styles.body}>
        <Text style={styles.text}>Olá, {name}!</Text>
        <Text style={styles.text}>A Black Friday do Agulhada.com começou!</Text>
        <Text style={styles.text}>
          Estava esperando uma oportunidade para voltar a receber alertas de agulhadas no Telegram ou acompanhar o
          mercado pelo nosso dashboard? Essa é a sua chance de escolher seu plano com até 50% de desconto.
        </Text>
        <Text style={styles.text}>
          PLANO ANUAL — 50% OFF<br />
          VIP: <strong>R$ 1.200</strong><br />
          Assinante: <strong>R$ 900</strong>
        </Text>
        <Text style={styles.text}>
          PLANO DE 6 MESES — 40% OFF<br />
          VIP: <strong>R$ 720</strong><br />
          Assinante: <strong>R$ 540</strong>
        </Text>
        <Text style={styles.text}>Os valores são pelo período completo, já com o desconto.</Text>
        <Text style={styles.text}>
          Acesse a oferta e escolha seu plano:
        </Text>
        <Text style={styles.text}>
          <Link href="https://www.agulhada.com/bf26">https://www.agulhada.com/bf26</Link>
        </Text>
        <Text style={styles.text}>Vem pegar as próximas agulhadas com a gente!</Text>
        <Text style={styles.text}>Equipe Agulhada.com</Text>
        <Text style={styles.footer}>
          Você recebeu este email porque se cadastrou no Agulhada.com.
          {stringValue(data.email) ? <><br />Email enviado para {stringValue(data.email)}</> : null}
          <br />
          <Link href={stringValue(data.unsubscribeUrl)}>Descadastrar</Link>
          <br />
          {emailAssets.postalAddress}
        </Text>
      </Body>
    </Html>
  );
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const styles = {
  body: {
    backgroundColor: "#ffffff",
    color: "#111111",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    margin: 0
  },
  text: { fontSize: "16px", lineHeight: "24px", margin: "0 0 16px" },
  footer: { color: "#666666", fontSize: "12px", lineHeight: "18px", margin: "28px 0 0" }
};
