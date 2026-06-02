import { Button } from "@react-email/components";
import React from "react";

type EmailButtonProps = {
  href: string;
  children: React.ReactNode;
  backgroundColor?: string;
};

export function EmailButton({ href, children, backgroundColor = "#2250f4" }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor,
        borderRadius: "6px",
        color: "#ffffff",
        display: "inline-block",
        fontSize: "16px",
        fontWeight: 600,
        lineHeight: "20px",
        padding: "12px 20px",
        textDecoration: "none"
      }}
    >
      {children}
    </Button>
  );
}
