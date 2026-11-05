import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SEC } from "../constants";
import { toNum } from "../utils";

type NumInputProps = {
  value: number;
  onCommit: (n: number) => void;
  style?: React.CSSProperties;
  min?: number;
  max?: number;
  step?: number;
  enforceMin?: boolean;
};

// Input numérico que permite editar libremente el primer dígito.
// Mantiene un string local; solo propaga el número hacia el padre cuando cambia.
// El padre nunca reescribe el string mientras el usuario está escribiendo.
export function NumInput({ value, onCommit, style, min, max, step, enforceMin }: NumInputProps) {
  const [local, setLocal] = useState<string>(String(value));
  const focused = useRef(false);

  // Solo sincroniza desde el padre cuando NO estamos editando.
  useEffect(() => {
    if (!focused.current) setLocal(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      style={style}
      value={local}
      min={min}
      max={max}
      step={step}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => {
        const raw = e.target.value;
        // Permitir solo dígitos y un punto decimal.
        const clean = raw.replace(/[^0-9.]/g, "");
        setLocal(clean);
        const n = toNum(clean);
        const clamped =
          enforceMin && min !== undefined && n < min ? min :
          max !== undefined && n > max ? max : n;
        onCommit(clamped);
      }}
      onBlur={() => {
        focused.current = false;
        const n = toNum(local);
        const clamped =
          enforceMin && min !== undefined && n < min ? min :
          max !== undefined && n > max ? max : n === 0 && enforceMin ? (min ?? 0) : n;
        onCommit(clamped);
        setLocal(clamped === 0 ? "" : String(clamped));
      }}
    />
  );
}

type SeccionProps = {
  tipo: keyof typeof SEC | string;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  accion?: ReactNode;
};

export function Seccion({ tipo, titulo, subtitulo, children, accion }: SeccionProps) {
  const s = (SEC[tipo as string] || SEC.trabajo) as { bg: string; border: string; head: string; icon: string };
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1.5px solid ${s.border}`,
        overflow: "hidden",
        marginBottom: 0,
        boxShadow: "0 2px 8px rgba(167,139,250,.1)",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${s.border} 0%, ${s.head}cc 100%)`,
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "'Poppins', system-ui, sans-serif",
              textShadow: "0 1px 3px rgba(0,0,0,.2)",
            }}
          >
            {s.icon} {titulo}
          </span>
          {subtitulo && (
            <span style={{ color: "rgba(255,255,255,.85)", fontSize: 11, marginLeft: 8, fontFamily: "'Poppins', system-ui, sans-serif" }}>
              {subtitulo}
            </span>
          )}
        </div>
        {accion}
      </div>
      <div style={{ background: s.bg, padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

type FieldProps = {
  label?: string;
  children: ReactNode;
  span2?: boolean;
};

export function Field({ label, children, span2 }: FieldProps) {
  return (
    <div style={span2 ? { gridColumn: "1/-1" } : {}}>
      {label && (
        <label
          style={{
            fontSize: 11,
            color: "#7c3aed",
            display: "block",
            marginBottom: 4,
            fontWeight: 600,
            fontFamily: "'Poppins', system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: ".4px",
          }}
        >
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export const inpStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1.5px solid #CDB4F3",
  background: "#fff",
  color: "#3b0764",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "'Poppins', system-ui, sans-serif",
  transition: "border-color .15s",
} as React.CSSProperties;

export const smlStyle: React.CSSProperties = {
  ...inpStyle,
  fontSize: 13,
  padding: "7px 10px",
} as React.CSSProperties;
