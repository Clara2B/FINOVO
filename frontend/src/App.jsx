import { useState, useEffect, useMemo, useCallback } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
import * as recharts from "recharts";
import { api } from "./api/client";
import { useAuth } from "./context/AuthContext";
const { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = recharts;
//  DESIGN TOKENS
const C = {
  bg: "#f0f4f8",
  surface: "#ffffff",
  sidebar: "#0f1e3d",        // Finovo deep navy
  sidebarHov: "#162952",
  sidebarActive: "#f26522",  // Finovo orange accent
  border: "#dde3ee",
  primary: "#0d4fa0",        // Finovo navy blue
  primaryLight: "#dbeeff",
  orange: "#f26522",         // Finovo orange
  orangeLight: "#fff0e8",
  green: "#0ea882",          // Finovo teal-green
  greenLight: "#d0f5ee",
  red: "#e03535",
  redLight: "#fde8e8",
  yellow: "#f59e0b",
  yellowLight: "#fef3c7",
  blue: "#3b9fd4",           // Finovo sky blue
  blueLight: "#dbeffe",
  text: "#0f1e3d",
  muted: "#5a6a85",
  dim: "#9aaac0",
  white: "#ffffff",
};
//  UTILS
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const tod = () => new Date().toISOString().split("T")[0];
const fmt = (v, decimals = 2) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: decimals });
const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};
const fmtMonth = (d) => {
  if (!d) return "";
  const [y, m] = d.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(m)-1]}/${y.slice(2)}`;
};
const getMonth = (d) => (d || "").slice(0, 7);
const today = new Date();
const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
});
// Meses para filtro de Bills: 6 passados + atual + 12 futuros
const BILL_MONTHS = Array.from({ length: 19 }, (_, i) => {
  const d = new Date(today.getFullYear(), today.getMonth() - 6 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
});
const CUR_MONTH = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
// Default categories — replaced by dynamic user categories at runtime via window.__userCats
const DEFAULT_CATS_EXPENSE = ["Alimentação","Transporte","Moradia","Saúde","Educação","Lazer","Vestuário","Assinaturas","Cartão de Crédito","Investimentos","Impostos","Outros"];
const DEFAULT_CATS_INCOME  = ["Salário","Freelance","Aluguel Recebido","Dividendos","Reembolso","Venda","Outros"];
const getCatsExpense = () => window.__userCats?.expense || DEFAULT_CATS_EXPENSE;
const getCatsIncome  = () => window.__userCats?.income  || DEFAULT_CATS_INCOME;
// Keep legacy const aliases updated at render time
let CATS_EXPENSE = DEFAULT_CATS_EXPENSE;
let CATS_INCOME  = DEFAULT_CATS_INCOME;
const DEFAULT_COST_CENTERS = [
  { id:"cc1", name:"Pessoal",       color:"#6c63ff", icon:"👤", active:true },
  { id:"cc2", name:"Casa",          color:"#22c55e", icon:"🏠", active:true },
  { id:"cc3", name:"Projeto A",     color:"#3b82f6", icon:"💼", active:true },
  { id:"cc4", name:"Projeto B",     color:"#f59e0b", icon:"🚀", active:true },
  { id:"cc5", name:"Empresa",       color:"#ef4444", icon:"🏢", active:true },
];
//  SEED DATA
function seedData() {
  const tx = [];
  const accounts = [
    { id: "acc1", name: "Conta Corrente Nubank", bank: "Nubank", type: "corrente", balance: 4280.5, color: "#820AD1" },
    { id: "acc2", name: "Poupança Itaú",         bank: "Itaú",   type: "poupança", balance: 12500.0, color: "#EC7000" },
    { id: "acc3", name: "Cartão Visa Crédito",    bank: "Visa",   type: "cartão",   balance: -1840.0, color: "#1A1F71" },
  ];
  const contacts = [
    { id: "c1", name: "Maria Silva",    type: "cliente",    email: "maria@email.com",  phone: "(11) 99999-1111" },
    { id: "c2", name: "João Construções", type: "fornecedor", email: "joao@obras.com",   phone: "(41) 98888-2222" },
    { id: "c3", name: "Ana Consultoria",  type: "cliente",    email: "ana@consult.com",  phone: "(11) 97777-3333" },
    { id: "c4", name: "Pedro Alimentos",  type: "fornecedor", email: "pedro@ali.com",    phone: "(41) 96666-4444" },
  ];
  MONTHS.forEach((m, mi) => {
    [6,8,4,5,3,7].forEach((_, i) => {
      tx.push({ id: uid(), desc: ["Salário","Freelance","Aluguel"][i%3], amount: [5000,1800,1200][i%3], type:"income",  category:"Salário",      date:`${m}-${String(5+i*3).padStart(2,"0")}`, status:"pago", accountId:"acc1", contactId: i%2===0?"c1":"c3", source:"manual", recurrence:"none", notes:"" });
    });
    [10,8,12,6,9,11].forEach((_, i) => {
      const cats = CATS_EXPENSE;
      tx.push({ id: uid(), desc: ["Supermercado","Aluguel","Internet","Energia","Combustível","Plano de Saúde"][i], amount: [650,1800,120,180,300,280][i], type:"expense", category: cats[i%cats.length], date:`${m}-${String(10+i*3).padStart(2,"0")}`, status: mi < 5 ? "pago" : (i<3?"pendente":"vencido"), accountId: i%2===0?"acc1":"acc3", contactId: i%2===0?"c2":"c4", source:"manual", recurrence: i===1?"monthly":"none", notes:"" });
    });
  });
  return { tx, accounts, contacts };
}
//  ICONS
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    dashboard: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    cashflow:  <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    bills:     <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
    accounts:  <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    contacts:  <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    import:    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    reports:   <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6"  y1="20" x2="6"  y2="14"/></svg>,
    plus:      <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit:      <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash:     <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    check:     <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    x:         <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    bell:      <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    menu:      <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    arrow_up:  <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
    arrow_dn:  <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    calendar:  <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    wallet:    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
    chart:     <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><polyline points="2 20 22 20"/></svg>,
    upload:    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    repeat:    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    eye:       <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeoff:    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    tag:       <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    recurrence:<svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2"/></svg>,
    bank:      <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
    link:      <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    unlink:    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M5.17 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/></svg>,
    refresh:   <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    settings:  <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    match:     <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/></svg>,
    warning:   <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    copy:      <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  };
  return icons[name] || null;
};
//  SHARED COMPONENTS
const Badge = ({ status }) => {
  const map = { pago: [C.green, C.greenLight, "Pago"], pendente: [C.yellow, C.yellowLight, "Pendente"], vencido: [C.red, C.redLight, "Vencido"], cancelado: [C.dim, "#f1f5f9", "Cancelado"] };
  const [color, bg, label] = map[status] || [C.dim, "#f1f5f9", status];
  return <span style={{ background: bg, color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{label}</span>;
};

const Btn = ({ onClick, variant = "primary", icon, children, small, danger, style: s }) => {
  const base = { display:"inline-flex", alignItems:"center", gap:6, borderRadius:8, fontFamily:"inherit", fontWeight:600, cursor:"pointer", border:"none", transition:"all .15s", whiteSpace:"nowrap", ...s };
  const variants = {
    primary: { background: `linear-gradient(135deg,${C.primary},#1a6bc4)`, color: "#fff", padding: small?"6px 14px":"9px 20px", fontSize: small?12:14, boxShadow:"0 2px 8px rgba(13,79,160,.25)", borderRadius:9 },
    ghost:   { background: "transparent", color: C.muted, border:`1px solid ${C.border}`, padding: small?"6px 12px":"9px 18px", fontSize: small?12:14 },
    danger:  { background: C.redLight, color: C.red,     padding: small?"6px 12px":"9px 18px", fontSize: small?12:14 },
    success: { background: C.greenLight, color: C.green, padding: small?"6px 12px":"9px 18px", fontSize: small?12:14 },
    icon:    { background: "transparent", color: C.muted, padding: 6, fontSize: 14 },
  };
  return <button style={{ ...base, ...(danger ? variants.danger : variants[variant]) }} onClick={onClick}>
    {icon && <Icon name={icon} size={small?13:15} />}{children}
  </button>;
};

const Field = ({ label, children, half, third }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5, gridColumn: half?"span 1":"span 2", ...(third?{gridColumn:"span 1"}:{}) }}>
    <label style={{ fontSize:11, fontWeight:600, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</label>
    {children}
  </div>
);

const inp = { background: "#f5f7fb", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontFamily:"'Poppins',inherit", fontSize:14, padding:"9px 12px", outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color .15s,box-shadow .15s" };

const Input = (props) => <input style={inp} {...props} />;
const Select = ({ children, ...props }) => <select style={{ ...inp, cursor:"pointer" }} {...props}>{children}</select>;
const Textarea = (props) => <textarea style={{ ...inp, minHeight:72, resize:"vertical" }} {...props} />;

const Modal = ({ title, onClose, children, width = 560 }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(26,29,46,.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
    <div style={{ background:C.surface, borderRadius:16, width:"100%", maxWidth:width, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,.18)" }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 0" }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:C.text }}>{title}</h3>
        <Btn variant="icon" onClick={onClose} icon="x" />
      </div>
      <div style={{ padding:"16px 24px 24px" }}>{children}</div>
    </div>
  </div>
);

const Card = ({ children, style: s }) => (
  <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:20, ...s }}>{children}</div>
);

const SummaryCard = ({ label, value, change, icon, color, colorLight, hideValue }) => (
  <Card style={{ display:"flex", flexDirection:"column", gap:12 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <span style={{ fontSize:12, fontWeight:600, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>{label}</span>
      <div style={{ background:colorLight, borderRadius:8, padding:8, display:"flex" }}><Icon name={icon} size={16} color={color} /></div>
    </div>
    <div>
      <div style={{ fontSize:22, fontWeight:800, color: hideValue ? "transparent" : C.text, textShadow: hideValue ? `0 0 12px ${C.dim}` : "none", userSelect: hideValue ? "none" : "auto" }}>{fmt(value)}</div>
      {change !== undefined && <div style={{ fontSize:12, color: change >= 0 ? C.green : C.red, marginTop:4, fontWeight:600 }}>
        {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}% vs mês anterior
      </div>}
    </div>
  </Card>
);
// ── MODAL DE PAGAMENTO ────────────────────────────────────────────────────────
const PayModal = ({ tx, onConfirm, onClose }) => {
  const [dataPag, setDataPag] = useState(tod());
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,29,46,.55)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={onClose}>
      <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:420,boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h3 style={{fontWeight:800,fontSize:17,color:C.text}}>✅ Confirmar Pagamento</h3>
          <button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:C.muted}}>×</button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.bg,borderRadius:10,padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>{tx.desc}</div>
            <div style={{fontSize:18,fontWeight:800,color:tx.type==="income"?C.green:tx.type==="transfer"?"#6c63ff":C.red}}>
              {tx.type==="income"?"+":tx.type==="transfer"?"⇄":"-"}{fmt(tx.amount)}
            </div>
            <div style={{fontSize:12,color:C.muted}}>Vencimento: {fmtDate(tx.date)}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>
              📅 Data do Pagamento
            </label>
            <input type="date" value={dataPag} onChange={e=>setDataPag(e.target.value)}
              style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 14px",
                fontSize:14,fontFamily:"inherit",color:C.text,outline:"none",width:"100%",boxSizing:"border-box"}} />
          </div>
        </div>
        <div style={{padding:"0 24px 20px",display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose}
            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 20px",
              fontFamily:"inherit",fontWeight:600,fontSize:14,cursor:"pointer",color:C.muted}}>
            Cancelar
          </button>
          <button onClick={()=>{ if(!dataPag){alert("Informe a data de pagamento.");return;} onConfirm(dataPag); }}
            style={{background:`linear-gradient(135deg,${C.green},#0c9a72)`,color:"#fff",border:"none",borderRadius:9,
              padding:"10px 24px",fontFamily:"inherit",fontWeight:700,fontSize:14,cursor:"pointer",
              boxShadow:"0 2px 8px rgba(14,168,130,.3)"}}>
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
};

// ── MODAL DE EDIÇÃO DE RECORRÊNCIA ────────────────────────────────────────────
const RecurrenceEditModal = ({ tx, onChoice, onClose }) => {
  const [choice, setChoice] = useState("single");
  const opts = [
    { value:"single",  label:"Somente este lançamento",            desc:"Altera apenas este registro, sem afetar os demais da série." },
    { value:"future",  label:"Este e todos os futuros",            desc:"Altera este e todos os lançamentos posteriores da mesma série." },
    { value:"all",     label:"Todos (passados, atual e futuros)",  desc:"Altera todos os lançamentos da série, independente da data." },
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,29,46,.55)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={onClose}>
      <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:480,boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h3 style={{fontWeight:800,fontSize:17,color:C.text}}>✏️ Editar Lançamento Recorrente</h3>
            <p style={{fontSize:12,color:C.muted,marginTop:3}}>Este lançamento faz parte de uma série recorrente.</p>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:C.muted}}>×</button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:10}}>
          <p style={{fontSize:13,color:C.muted,marginBottom:4}}>O que deseja alterar?</p>
          {opts.map(o=>(
            <label key={o.value} onClick={()=>setChoice(o.value)}
              style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",borderRadius:10,cursor:"pointer",
                border:`2px solid ${choice===o.value?C.primary:C.border}`,
                background:choice===o.value?C.primaryLight:"transparent",transition:"all .15s"}}>
              <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${choice===o.value?C.primary:C.dim}`,
                background:choice===o.value?C.primary:"transparent",flexShrink:0,marginTop:2,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {choice===o.value && <div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}} />}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{o.label}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{o.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <div style={{padding:"0 24px 20px",display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose}
            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 20px",
              fontFamily:"inherit",fontWeight:600,fontSize:14,cursor:"pointer",color:C.muted}}>
            Cancelar
          </button>
          <button onClick={()=>onChoice(choice)}
            style={{background:`linear-gradient(135deg,${C.primary},#1a6bc4)`,color:"#fff",border:"none",borderRadius:9,
              padding:"10px 24px",fontFamily:"inherit",fontWeight:700,fontSize:14,cursor:"pointer",
              boxShadow:"0 2px 8px rgba(13,79,160,.25)"}}>
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
};

//  TRANSACTION FORM
const TxForm = ({ initial, accounts, contacts, onSave, onClose }) => {
  const aCE = () => [...DEFAULT_CATS_EXPENSE, ...(window.__userCats?.expense||[])];
  const aCI = () => [...DEFAULT_CATS_INCOME,  ...(window.__userCats?.income ||[])];
  const blank = { id:uid(), desc:"", amount:"", type:"expense", category:aCE()[0]||"Outros",
    date:tod(), status:"pendente", paidAt:"", accountId:accounts[0]?.id||"",
    contactId:"", costCenterId:"", recurrence:"none", installments:"2", notes:"", source:"manual",
    attachment:null, attachmentName:"" };
  const [form, setForm] = useState({ ...blank, ...(initial||{}) });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const cats = form.type==="income" ? aCI() : aCE();

  const handleFile = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => { set("attachment",ev.target.result); set("attachmentName",file.name); };
    reader.readAsDataURL(file);
  };

  const addMonthsClamped = (date, monthsToAdd) => {
    const d = new Date(date);
    const originalDay = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth()+monthsToAdd);
    const lastDay = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    d.setDate(Math.min(originalDay, lastDay));
    return d;
  };

  const seriesDates = useMemo(() => {
    if(form.recurrence==="none") return [form.date];
    const n = Math.max(1, Math.min(parseInt(form.installments)||1, 120));
    const start = new Date(form.date+"T12:00:00");
    const dates = [];
    for(let i=0;i<n;i++){
      let d;
      if(form.recurrence==="weekly")      { d=new Date(start); d.setDate(d.getDate()+i*7); }
      else if(form.recurrence==="biweekly")    { d=new Date(start); d.setDate(d.getDate()+i*14); }
      else if(form.recurrence==="monthly")     d = addMonthsClamped(start, i);
      else if(form.recurrence==="bimonthly")   d = addMonthsClamped(start, i*2);
      else if(form.recurrence==="quarterly")   d = addMonthsClamped(start, i*3);
      else if(form.recurrence==="semiannual")  d = addMonthsClamped(start, i*6);
      else if(form.recurrence==="yearly")      { d=new Date(start); d.setFullYear(d.getFullYear()+i); }
      else d = new Date(start);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, [form.recurrence, form.date, form.installments]);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
      <div style={{ gridColumn:"span 2", display:"flex", gap:0, background:"#f1f3f9", borderRadius:10, padding:4 }}>
        {[["expense","↓  Despesa"],["income","↑  Receita"],["transfer","⇄  Transferência"]].map(([t,label]) => (
          <button key={t} onClick={()=>{ set("type",t); if(t!=="transfer") set("category", t==="income"?aCI()[0]:aCE()[0]); else set("category","Transferência"); }}
            style={{ flex:1, padding:"8px 0", borderRadius:7, border:"none", fontFamily:"inherit", fontWeight:700, fontSize:13, cursor:"pointer", transition:"all .15s",
              background: form.type===t?(t==="income"?C.green:t==="expense"?C.red:"#6c63ff"):"transparent",
              color: form.type===t?"#fff":C.muted }}>
            {label}
          </button>
        ))}
      </div>
      {form.type==="transfer" && (
        <div style={{ gridColumn:"span 2", background:"#f0eeff", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#5b50cc", fontWeight:600 }}>
          ⇄ Transferências entre suas contas não afetam o saldo total (receitas − despesas).
        </div>
      )}
      <Field label="Descrição" half={false}><Input value={form.desc} onChange={e=>set("desc",e.target.value)} placeholder={form.type==="transfer"?"Ex: Transferência para XP Investimentos":"Ex: Conta de luz"} /></Field>
      <Field label="Valor (R$)" half><Input type="number" min="0" step="0.01" value={form.amount} onChange={e=>set("amount",e.target.value)} placeholder="0,00" /></Field>
      <Field label="Data" half><Input type="date" value={form.date} onChange={e=>set("date",e.target.value)} /></Field>
      <Field label="Status" half>
        <Select value={form.status} onChange={e=>{ set("status",e.target.value); if(e.target.value==="pago"&&!form.paidAt) set("paidAt",tod()); }}>
          <option value="pendente">Pendente</option>
          <option value="pago">Realizado</option>
          <option value="vencido">Vencido</option>
          <option value="cancelado">Cancelado</option>
        </Select>
      </Field>
      {form.status==="pago" && (
        <Field label="📅 Data do Pagamento" half>
          <Input type="date" value={form.paidAt||tod()} onChange={e=>set("paidAt",e.target.value)} />
        </Field>
      )}
      {form.type!=="transfer" && (
        <Field label="Categoria" half>
          <Select value={form.category} onChange={e=>set("category",e.target.value)}>
            {cats.map(c=><option key={c}>{c}</option>)}
          </Select>
        </Field>
      )}
      <Field label={form.type==="transfer"?"Conta de Origem":"Conta Bancária"} half>
        <Select value={form.accountId} onChange={e=>set("accountId",e.target.value)}>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Field>
      {form.type==="transfer" && (
        <Field label="Conta de Destino (referência)" half>
          <Select value={form.toAccountId||""} onChange={e=>set("toAccountId",e.target.value)}>
            <option value="">— Selecione —</option>
            {accounts.filter(a=>a.id!==form.accountId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Centro de Custo" half>
        <Select value={form.costCenterId} onChange={e=>set("costCenterId",e.target.value)}>
          <option value="">— Sem centro de custo —</option>
          {(window.__costCenters||DEFAULT_COST_CENTERS).filter(cc=>cc.active).map(cc=>(
            <option key={cc.id} value={cc.id}>{cc.icon} {cc.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Recorrência" half>
        <Select value={form.recurrence} onChange={e=>set("recurrence",e.target.value)}>
          <option value="none">Sem recorrência</option>
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quinzenal</option>
          <option value="monthly">Mensal</option>
          <option value="bimonthly">Bimestral</option>
          <option value="quarterly">Trimestral</option>
          <option value="semiannual">Semestral</option>
          <option value="yearly">Anual</option>
        </Select>
      </Field>
      {form.recurrence!=="none" && (
        <Field label="Quantas vezes (parcelas)" half>
          <Input type="number" min="2" max="120" value={form.installments}
            onChange={e=>set("installments",e.target.value)} placeholder="Ex: 12" />
        </Field>
      )}
      {form.recurrence!=="none" && seriesDates.length>1 && (
        <div style={{ gridColumn:"span 2", background:"#f7f8fc", borderRadius:10, padding:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>
            Prévia — {seriesDates.length} lançamentos · Total: {fmt((parseFloat(form.amount)||0)*seriesDates.length)}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, maxHeight:80, overflow:"auto" }}>
            {seriesDates.map((d,i)=>(
              <span key={i} style={{ fontSize:11, background:C.primaryLight, color:C.primary, borderRadius:5, padding:"2px 8px", fontWeight:600 }}>
                {i+1}/{seriesDates.length} {fmtDate(d)}
              </span>
            ))}
          </div>
        </div>
      )}
      <Field label="Contato" half>
        <Select value={form.contactId} onChange={e=>set("contactId",e.target.value)}>
          <option value="">— Nenhum —</option>
          {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="📎 Anexar NF / Boleto" half={false}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"#f5f7fb",
            border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",
            fontSize:13,color:C.muted,fontWeight:600}}>
            📁 {form.attachmentName||"Selecionar arquivo"}
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFile} style={{display:"none"}} />
          </label>
          {form.attachmentName && (
            <button onClick={()=>{set("attachment",null);set("attachmentName","");}}
              style={{background:C.redLight,color:C.red,border:"none",borderRadius:7,
                padding:"8px 10px",cursor:"pointer",fontSize:13}}>✕</button>
          )}
          {form.attachment && form.attachment.startsWith("data:image") && (
            <img src={form.attachment} alt="preview"
              style={{height:36,borderRadius:6,objectFit:"cover",border:`1px solid ${C.border}`}} />
          )}
          {form.attachment && !form.attachment.startsWith("data:image") && (
            <a href={form.attachment} download={form.attachmentName}
              style={{fontSize:12,color:C.primary,fontWeight:600}}>⬇ Baixar PDF</a>
          )}
        </div>
      </Field>
      <Field label="Observações" half={false}><Textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Anotações opcionais..." /></Field>
      <div style={{ gridColumn:"span 2", display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" icon="check" disabled={form._saving} onClick={()=>{
          if(!form.desc||!form.amount){ alert("Preencha descrição e valor."); return; }
          if(form._saving) return;
          set("_saving", true);
          onSave({ ...form, amount: parseFloat(form.amount), seriesDates });
        }}>{form._saving ? "Salvando..." : "Salvar"}</Btn>
      </div>
    </div>
  );
};
//  FINANCIAL CALENDAR
const FinancialCalendar = ({ txs, costCenters, accounts, onSelectDay }) => {
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based
  const [selDay,   setSelDay]   = useState(null);
  const [ccFilter, setCcFilter] = useState("all");

  const WDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const MNAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const firstDay   = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr    = today.toISOString().split("T")[0];
  const monthStr    = `${calYear}-${String(calMonth+1).padStart(2,"0")}`;

  // Map day → transactions
  const dayMap = useMemo(() => {
    const m = {};
    txs.filter(t => getMonth(t.date) === monthStr && (ccFilter==="all" || t.costCenterId===ccFilter)).forEach(t => {
      const day = parseInt(t.date.split("-")[2]);
      if (!m[day]) m[day] = [];
      m[day].push(t);
    });
    return m;
  }, [txs, monthStr, ccFilter]);

  const getDayColor = (txList) => {
    if (!txList || txList.length===0) return null;
    const hasOverdue  = txList.some(t=>t.status==="vencido");
    const hasPending  = txList.some(t=>t.status==="pendente");
    const allPaid     = txList.every(t=>t.status==="pago"||t.status==="cancelado");
    if (hasOverdue)  return C.red;
    if (hasPending)  return C.yellow;
    if (allPaid)     return C.green;
    return C.primary;
  };

  const prevMonth = () => { if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1); setSelDay(null); };
  const nextMonth = () => { if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1); setSelDay(null); };

  // Monthly totals for selected cc
  const mTxs = txs.filter(t=>getMonth(t.date)===monthStr&&(ccFilter==="all"||t.costCenterId===ccFilter));
  const mInc = mTxs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const mExp = mTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  const selTxs = selDay ? (dayMap[selDay]||[]).map(t=>({
    ...t,
    accountName: (accounts||[]).find(a=>a.id===t.accountId)?.name || t.category,
  })) : [];

  return (
    <Card style={{ padding:0, overflow:"hidden" }}>
      {/* Calendar header */}
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={prevMonth} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:7, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:16 }}>‹</button>
          <h3 style={{ fontSize:16, fontWeight:800, minWidth:160, textAlign:"center" }}>{MNAMES[calMonth]} {calYear}</h3>
          <button onClick={nextMonth} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:7, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:16 }}>›</button>
          <button onClick={()=>{setCalYear(today.getFullYear());setCalMonth(today.getMonth());setSelDay(null);}} style={{ background:C.primaryLight, border:"none", borderRadius:7, padding:"4px 10px", cursor:"pointer", fontSize:12, fontWeight:600, color:C.primary }}>Hoje</button>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          {/* CC filter chips */}
          <button onClick={()=>setCcFilter("all")} style={{ background:ccFilter==="all"?C.primary:C.bg, color:ccFilter==="all"?"#fff":C.muted, border:`1px solid ${ccFilter==="all"?C.primary:C.border}`, borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Todos</button>
          {costCenters.filter(cc=>cc.active).map(cc=>(
            <button key={cc.id} onClick={()=>setCcFilter(cc.id===ccFilter?"all":cc.id)} style={{ background:ccFilter===cc.id?cc.color:C.bg, color:ccFilter===cc.id?"#fff":C.muted, border:`1px solid ${ccFilter===cc.id?cc.color:C.border}`, borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {cc.icon} {cc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Month summary strip */}
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}` }}>
        {[["Receitas",mInc,C.green],["Despesas",mExp,C.red],["Saldo",mInc-mExp,mInc-mExp>=0?C.green:C.red]].map(([l,v,c])=>(
          <div key={l} style={{ flex:1, padding:"8px 16px", textAlign:"center", borderRight:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>{l}</div>
            <div style={{ fontSize:14, fontWeight:800, color:c, marginTop:2 }}>{fmt(v)}</div>
          </div>
        ))}
        <div style={{ flex:1, padding:"8px 16px", textAlign:"center" }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Lançamentos</div>
          <div style={{ fontSize:14, fontWeight:800, color:C.text, marginTop:2 }}>{mTxs.length}</div>
        </div>
      </div>

      {/* Grid do calendário */}
      <div style={{ padding:16 }}>
        {/* Weekday headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
          {WDAYS.map(w=>(
            <div key={w} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:C.muted, padding:"0 0 6px", letterSpacing:"0.05em" }}>{w}</div>
          ))}
        </div>
        {/* Days grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i} />)}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day = i+1;
            const dateStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const txList  = dayMap[day];
            const dotColor= getDayColor(txList);
            const isToday = dateStr===todayStr;
            const isSel   = selDay===day;
            const expAmt  = txList?.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)||0;
            const incAmt  = txList?.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0)||0;

            return (
              <div key={day}
                onClick={()=>setSelDay(isSel?null:day)}
                style={{
                  borderRadius:10, padding:"6px 4px",
                  cursor:txList?"pointer":"default",
                  background: isSel ? C.primary : isToday ? C.primaryLight : "transparent",
                  border:`1px solid ${isSel?C.primary:isToday?C.primary:"transparent"}`,
                  transition:"all .1s", minHeight:56,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                  position:"relative",
                }}>
                {txList?.some(t=>t.status==="vencido") && !isSel && (
                  <div style={{ position:"absolute", inset:-2, borderRadius:12, border:`2px solid ${C.red}`, animation:"pulse 2s infinite", pointerEvents:"none" }} />
                )}
                <span style={{ fontSize:13, fontWeight: isToday||isSel ? 800 : txList?600:400, color: isSel?"#fff":isToday?C.primary:txList?C.text:C.dim }}>
                  {day}
                </span>
                {txList && (
                  <>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:isSel?"rgba(255,255,255,.8)":dotColor||C.primary, flexShrink:0 }} />
                    {expAmt>0 && <span style={{ fontSize:9, fontWeight:700, color:isSel?"rgba(255,255,255,.85)":C.red, lineHeight:1 }}>-{(expAmt/1000).toFixed(1)}k</span>}
                    {incAmt>0 && <span style={{ fontSize:9, fontWeight:700, color:isSel?"rgba(255,255,255,.85)":C.green, lineHeight:1 }}>+{(incAmt/1000).toFixed(1)}k</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        {/* Legend */}
        <div style={{ display:"flex", gap:12, marginTop:12, flexWrap:"wrap" }}>
          {[[C.green,"Pago"],[C.yellow,"Pendente"],[C.red,"Vencido"],[C.primary,"Misto"]].map(([c,l])=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:c }} />
              <span style={{ fontSize:11, color:C.muted }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Painel de detalhes do dia — abaixo do calendário */}
      {selDay && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"14px 16px" }}>
          <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:12 }}>
            {String(selDay).padStart(2,"0")}/{String(calMonth+1).padStart(2,"0")}/{calYear}
            <span style={{ fontSize:11, fontWeight:500, color:C.muted, marginLeft:8 }}>{selTxs.length} lançamento{selTxs.length!==1?"s":""}</span>
          </div>
          {selTxs.length===0
            ? <p style={{ fontSize:12, color:C.dim }}>Sem lançamentos neste dia.</p>
            : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {/* A Pagar */}
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8, display:"flex", justifyContent:"space-between" }}>
                    <span>A Pagar / Despesas</span>
                    <span>{fmt(selTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0))}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {selTxs.filter(t=>t.type==="expense").length===0
                      ? <p style={{ fontSize:12, color:C.dim }}>Nenhuma despesa</p>
                      : selTxs.filter(t=>t.type==="expense").map(t=>(
                        <div key={t.id} style={{ background:C.redLight, borderRadius:9, padding:"9px 11px", borderLeft:`3px solid ${C.red}` }}>
                          <div style={{ fontSize:12, fontWeight:700, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.desc}</div>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                            <span style={{ fontSize:13, fontWeight:800, color:C.red }}>{fmt(t.amount)}</span>
                            <Badge status={t.status} />
                          </div>
                          <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{t.accountName || t.category}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
                {/* A Receber */}
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:C.green, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8, display:"flex", justifyContent:"space-between" }}>
                    <span>A Receber / Receitas</span>
                    <span>{fmt(selTxs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0))}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {selTxs.filter(t=>t.type==="income").length===0
                      ? <p style={{ fontSize:12, color:C.dim }}>Nenhuma receita</p>
                      : selTxs.filter(t=>t.type==="income").map(t=>(
                        <div key={t.id} style={{ background:C.greenLight, borderRadius:9, padding:"9px 11px", borderLeft:`3px solid ${C.green}` }}>
                          <div style={{ fontSize:12, fontWeight:700, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.desc}</div>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                            <span style={{ fontSize:13, fontWeight:800, color:C.green }}>{fmt(t.amount)}</span>
                            <Badge status={t.status} />
                          </div>
                          <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{t.accountName || t.category}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )
          }
        </div>
      )}
    </Card>
  );
};
//  DASHBOARD
const Dashboard = ({ txs, accounts, contacts, costCenters, onNew }) => {
  const [hideValues,  setHideValues]  = useState(false);
  const [dashMonth,   setDashMonth]   = useState(CUR_MONTH);

  // Mês atual fixo para summary cards e CC (sempre mês corrente)
  const cur  = CUR_MONTH;
  const prev = MONTHS[MONTHS.length - 2];
  const curTxs  = txs.filter(t => getMonth(t.date) === cur);
  const prevTxs = txs.filter(t => getMonth(t.date) === prev);
  const sum = (arr, type) => arr.filter(t=>t.type===type&&t.status!=="cancelado").reduce((s,t)=>s+t.amount,0);
  const curInc  = sum(curTxs,  "income");
  const curExp  = sum(curTxs,  "expense");
  const prevInc = sum(prevTxs, "income");
  const prevExp = sum(prevTxs, "expense");
  const pct = (c, p) => p===0 ? 0 : ((c - p) / p) * 100;

  // "Contas do Mês" — mês navegável
  const dashTxs   = txs.filter(t => getMonth(t.date) === dashMonth && t.status !== "cancelado");
  const mesAPagar  = dashTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const mesAReceber= dashTxs.filter(t=>t.type==="income" ).reduce((s,t)=>s+t.amount,0);
  const dashMonthIdx = BILL_MONTHS.indexOf(dashMonth);
  const prevDashMonth = dashMonthIdx > 0 ? BILL_MONTHS[dashMonthIdx-1] : null;
  const nextDashMonth = dashMonthIdx < BILL_MONTHS.length-1 ? BILL_MONTHS[dashMonthIdx+1] : null;

  const pieData   = Object.entries(
    curTxs.filter(t=>t.type==="expense"&&t.status!=="cancelado")
      .reduce((m,t)=>({...m,[t.category]:(m[t.category]||0)+t.amount}),{})
  ).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value}));
  const pieColors = [C.primary, C.red, C.yellow, C.blue, C.green, "#e879f9"];

  const upcoming = txs.filter(t => t.type==="expense" && (t.status==="pendente"||t.status==="vencido") && t.date >= tod())
    .sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const overdue  = txs.filter(t => t.status==="vencido");

  const ccSummary = useMemo(()=>{
    const m = {};
    curTxs.filter(t=>t.costCenterId&&t.type==="expense").forEach(t=>{ m[t.costCenterId]=(m[t.costCenterId]||0)+t.amount; });
    return Object.entries(m).map(([id,total])=>({ cc: costCenters.find(c=>c.id===id)||{name:id,color:C.dim,icon:"?"}, total })).sort((a,b)=>b.total-a.total);
  },[curTxs,costCenters]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:24, fontWeight:800, color:C.text }}>Dashboard</h2>
          <p style={{ fontSize:13, color:C.muted, marginTop:2 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="ghost" small icon={hideValues?"eye":"eyeoff"} onClick={()=>setHideValues(v=>!v)}>{hideValues?"Mostrar":"Ocultar"} valores</Btn>
          <Btn variant="primary" icon="plus" onClick={onNew}>Nova transação</Btn>
        </div>
      </div>

      {overdue.length > 0 && (
        <div style={{ background:C.redLight, border:`1px solid ${C.red}22`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <Icon name="bell" size={16} color={C.red} />
          <span style={{ fontSize:13, color:C.red, fontWeight:600 }}>{overdue.length} lançamento{overdue.length>1?"s":""} vencido{overdue.length>1?"s":""} — verifique suas contas a pagar.</span>
        </div>
      )}

      {/* Summary cards — 3 colunas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <SummaryCard label="Receitas (mês)" value={curInc}       change={pct(curInc,prevInc)}  icon="arrow_up" color={C.green}  colorLight={C.greenLight}  hideValue={hideValues} />
        <SummaryCard label="Despesas (mês)" value={curExp}       change={pct(curExp,prevExp)}   icon="arrow_dn" color={C.red}    colorLight={C.redLight}    hideValue={hideValues} />
        <SummaryCard label="Saldo do Mês"   value={curInc-curExp}                               icon="chart"    color={C.blue}   colorLight={C.blueLight}   hideValue={hideValues} />
      </div>

      {/* Calendário */}
      <FinancialCalendar txs={txs} costCenters={costCenters} accounts={accounts} />

      {/* Gráfico de pizza + Centro de Custo */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>Top Gastos do Mês</h3>
          {pieData.length === 0 ? <p style={{ color:C.dim, fontSize:13 }}>Sem dados</p> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={56} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie><Tooltip formatter={v=>[fmt(v)]} contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }} /></PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:6 }}>
                {pieData.map((d,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:7, height:7, borderRadius:2, background:pieColors[i], flexShrink:0 }} /><span style={{ fontSize:11, color:C.muted }}>{d.name}</span></div>
                    <span style={{ fontSize:11, fontWeight:600 }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {ccSummary.length > 0 ? (
          <Card>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>Despesas por Centro de Custo</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {ccSummary.map(({cc,total})=>{
                const p = curExp>0?(total/curExp*100):0;
                return (
                  <div key={cc.id} style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:cc.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{cc.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600 }}>{cc.name}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:C.red }}>{fmt(total)}</span>
                      </div>
                      <div style={{ background:C.border, borderRadius:4, height:6, overflow:"hidden" }}>
                        <div style={{ width:`${p}%`, height:"100%", background:cc.color, borderRadius:4, transition:"width .5s" }} />
                      </div>
                    </div>
                    <span style={{ fontSize:11, color:C.muted, width:36, textAlign:"right" }}>{p.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
            <p style={{ color:C.dim, fontSize:13, textAlign:"center" }}>Sem centros de custo no mês</p>
          </Card>
        )}
      </div>

      {/* Contas Bancárias */}
      <Card>
        {/* Cabeçalho com títulos fixos das colunas */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 120px 120px", gap:8, marginBottom:8,
                      paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted }}>
            Contas Bancárias — {fmtMonth(dashMonth+"-01")}{dashMonth>CUR_MONTH?" 🔮":""}
          </div>
          <div style={{ fontSize:10, fontWeight:700, color:C.green, textTransform:"uppercase", textAlign:"right" }}>Receitas</div>
          <div style={{ fontSize:10, fontWeight:700, color:C.red,   textTransform:"uppercase", textAlign:"right" }}>Despesas</div>
          <div style={{ fontSize:10, fontWeight:700, color:C.red,   textTransform:"uppercase", textAlign:"right" }}>A Pagar</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {accounts.map(a => {
            const mesTxs  = txs.filter(t=>t.accountId===a.id&&getMonth(t.date)===dashMonth&&t.status!=="cancelado");
            const mesInc  = mesTxs.filter(t=>t.type==="income" ).reduce((s,t)=>s+t.amount,0);
            const mesExp  = mesTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
            const mesPend = mesTxs.filter(t=>t.type==="expense"&&(t.status==="pendente"||t.status==="vencido")).reduce((s,t)=>s+t.amount,0);
            if (mesInc===0 && mesExp===0) return null;
            return (
              <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1fr 120px 120px 120px", gap:8,
                   alignItems:"center", padding:"8px 10px", background:C.bg, borderRadius:9,
                   borderLeft:`3px solid ${a.color}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:a.color+"22", display:"flex",
                       alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon name="wallet" size={13} color={a.color} />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{a.bank} · {a.type}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:mesInc>0?C.green:C.dim }}>
                  {hideValues?"••••":fmt(mesInc)}
                </div>
                <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:mesExp>0?C.red:C.dim }}>
                  {hideValues?"••••":fmt(mesExp)}
                </div>
                <div style={{ textAlign:"right", fontSize:13, fontWeight:800,
                     color:mesPend>0?C.red:C.dim,
                     background:mesPend>0?C.redLight:"transparent",
                     borderRadius:6, padding:mesPend>0?"3px 8px":"0" }}>
                  {hideValues?"••••":fmt(mesPend)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Contas do Mês + Próximos Vencimentos */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* Contas do Mês */}
        <Card>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
            <h3 style={{ fontSize:15, fontWeight:700 }}>Contas do Mês</h3>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button onClick={()=>prevDashMonth&&setDashMonth(prevDashMonth)} disabled={!prevDashMonth}
                style={{ background:"none", border:"none", cursor:prevDashMonth?"pointer":"default",
                         color:prevDashMonth?C.text:C.dim, fontSize:16, padding:"2px 6px", borderRadius:6,
                         opacity:prevDashMonth?1:.3 }}>‹</button>
              <span style={{ fontSize:12, fontWeight:700, color:C.primary, minWidth:80, textAlign:"center" }}>
                {fmtMonth(dashMonth+"-01")}{dashMonth > CUR_MONTH ? " 🔮" : ""}
              </span>
              <button onClick={()=>nextDashMonth&&setDashMonth(nextDashMonth)} disabled={!nextDashMonth}
                style={{ background:"none", border:"none", cursor:nextDashMonth?"pointer":"default",
                         color:nextDashMonth?C.text:C.dim, fontSize:16, padding:"2px 6px", borderRadius:6,
                         opacity:nextDashMonth?1:.3 }}>›</button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ background:C.redLight, borderRadius:12, padding:"16px 18px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>A Pagar</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.red }}>{hideValues?"••••":fmt(mesAPagar)}</div>
              <div style={{ fontSize:11, color:C.red, marginTop:4, opacity:.7 }}>
                {dashTxs.filter(t=>t.type==="expense").length} lançamento{dashTxs.filter(t=>t.type==="expense").length!==1?"s":""}
              </div>
            </div>
            <div style={{ background:C.greenLight, borderRadius:12, padding:"16px 18px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.green, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>A Receber</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.green }}>{hideValues?"••••":fmt(mesAReceber)}</div>
              <div style={{ fontSize:11, color:C.green, marginTop:4, opacity:.7 }}>
                {dashTxs.filter(t=>t.type==="income").length} lançamento{dashTxs.filter(t=>t.type==="income").length!==1?"s":""}
              </div>
            </div>
          </div>

          {mesAPagar > 0 || mesAReceber > 0 ? (
            <div style={{ marginTop:14, padding:"10px 14px", background:C.bg, borderRadius:10,
                          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Saldo do mês</span>
              <span style={{ fontSize:14, fontWeight:800, color:(mesAReceber-mesAPagar)>=0?C.green:C.red }}>
                {hideValues?"••••":fmt(mesAReceber-mesAPagar)}
              </span>
            </div>
          ) : (
            <p style={{ marginTop:14, fontSize:13, color:C.dim, textAlign:"center" }}>
              {dashMonth > CUR_MONTH ? "🔮 Nenhum lançamento previsto" : "Nenhum lançamento neste mês"}
            </p>
          )}
        </Card>

        {/* Próximos Vencimentos */}
        <Card>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>Próximos Vencimentos</h3>
          {upcoming.length===0 ? <p style={{ color:C.dim, fontSize:13 }}>Nenhum vencimento próximo 🎉</p> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {upcoming.map(t=>{
                const accName = accounts.find(a=>a.id===t.accountId)?.name || "Sem conta definida";
                return (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                       padding:"10px 12px", background:C.bg, borderRadius:8, gap:8 }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.desc}</div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{fmtDate(t.date)} · {accName}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:C.red }}>{fmt(t.amount)}</span>
                      <Badge status={t.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
//  EXPORT UTILITIES (CSV + Excel-compatible)
const escCsv = (v) => {
  const s = String(v ?? "").replace(/"/g, '""');
  return /[,"\n\r]/.test(s) ? `"${s}"` : s;
};

const buildExportRows = (list, accounts, contacts, costCenters) => {
  return list.map(t => ({
    Data:          t.date,
    Descrição:     t.desc,
    Valor:         t.amount.toFixed(2).replace(".", ","),
    Tipo:          t.type === "income" ? "Receita" : "Despesa",
    Categoria:     t.category,
    "Centro de Custo": costCenters?.find(c=>c.id===t.costCenterId)?.name || "",
    Status:        ({ pago:"Pago", pendente:"Pendente", vencido:"Vencido", cancelado:"Cancelado" }[t.status])||t.status,
    Conta:         accounts?.find(a=>a.id===t.accountId)?.name || "",
    Contato:       contacts?.find(c=>c.id===t.contactId)?.name || "",
    Recorrência:   t.recurrenceGroupName || (t.recurrence!=="none"?t.recurrence:""),
    Observações:   t.notes || "",
  }));
};

const exportToCsv = (list, accounts, contacts, costCenters, filename="finovo_export") => {
  const rows  = buildExportRows(list, accounts, contacts, costCenters);
  if (rows.length === 0) { alert("Nenhum lançamento para exportar."); return; }
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.map(escCsv).join(","),
    ...rows.map(r => headers.map(h => escCsv(r[h])).join(","))
  ];
  const bom  = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([bom + csvLines.join("\r\n")], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const exportToExcel = (list, accounts, contacts, costCenters, filename="finovo_export") => {
  const rows    = buildExportRows(list, accounts, contacts, costCenters);
  if (rows.length === 0) { alert("Nenhum lançamento para exportar."); return; }
  const headers = Object.keys(rows[0]);

  // Build XLSX manually (XML-based .xlsx via SheetJS if available, else XLS fallback)
  if (window.XLSX) {
    const wsData = [headers, ...rows.map(r=>headers.map(h=>r[h]))];
    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    // Column widths
    ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));
    // Style header row bold (SheetJS CE doesn't support styles, but set anyway)
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    window.XLSX.writeFile(wb, `${filename}.xlsx`);
  } else {
    // Fallback: HTML table as .xls
    const headers_html = headers.map(h=>`<th style="background:#0d4fa0;color:#fff;font-weight:bold;padding:6px 10px;">${h}</th>`).join("");
    const rows_html = rows.map(r=>`<tr>${headers.map(h=>`<td style="padding:5px 10px;">${r[h]}</td>`).join("")}</tr>`).join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table><thead><tr>${headers_html}</tr></thead><tbody>${rows_html}</tbody></table></body></html>`;
    const blob = new Blob(["\uFEFF" + html], { type:"application/vnd.ms-excel;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${filename}.xls`; a.click();
    URL.revokeObjectURL(url);
  }
};

// Export from Reports page (all txs, filtered by year)
const exportAllToExcel = (txs, accounts, contacts, costCenters, year) => {
  const list = txs.filter(t=>t.date.startsWith(year));
  exportToExcel(list, accounts, contacts, costCenters, `finovo_${year}_completo`);
};
//  BILLS (Contas a pagar/receber)
const Bills = ({ txs, accounts, contacts, costCenters, onAdd, onEdit, onDelete, onMarkPaid, onBulkEdit, onDuplicate }) => {
  const [tab, setTab]         = useState("expense");
  const [search, setSearch]   = useState("");
  const [statusF, setStatusF] = useState("all");
  const [monthF, setMonthF]   = useState(CUR_MONTH);
  const [selIds, setSelIds]   = useState(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkForm, setBulkForm]   = useState({});
  const [ccF, setCcF]   = useState("all");
  const [catF, setCatF] = useState("all");
  const [accF, setAccF] = useState("all");
  CATS_EXPENSE = getCatsExpense(); CATS_INCOME = getCatsIncome();

  const list = txs.filter(t =>
    t.type===tab &&
    (statusF==="all"  || t.status===statusF) &&
    (monthF==="all"   || getMonth(t.date)===monthF) &&
    (ccF==="all"      || t.costCenterId===ccF) &&
    (catF==="all"     || t.category===catF) &&
    (accF==="all"     || t.accountId===accF) &&
    (search==="" || t.desc.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b)=>a.date.localeCompare(b.date));

  const total   = list.reduce((s,t)=>s+t.amount,0);
  const paid    = list.filter(t=>t.status==="pago").reduce((s,t)=>s+t.amount,0);
  const pending = list.filter(t=>t.status==="pendente"||t.status==="vencido").reduce((s,t)=>s+t.amount,0);

  const toggleSel = id => setSelIds(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const allSel = list.length>0 && list.every(t=>selIds.has(t.id));
  const getContact = id => contacts.find(c=>c.id===id);
  const selList = list.filter(t=>selIds.has(t.id));

  const applyBulk = () => {
    onBulkEdit(selList.map(t=>({
      ...t,
      ...(bulkForm.date     ? {date:bulkForm.date}         : {}),
      ...(bulkForm.status   ? {status:bulkForm.status}     : {}),
      ...(bulkForm.category ? {category:bulkForm.category} : {}),
      ...(bulkForm.accountId? {accountId:bulkForm.accountId}: {}),
      ...(bulkForm.costCenterId!==undefined ? {costCenterId:bulkForm.costCenterId} : {}),
      ...(bulkForm.type     ? {type:bulkForm.type}         : {}),
    })));
    setSelIds(new Set());
    setBulkForm({});
    setBulkModal(false);
  };

  const cats = tab==="income" ? getCatsIncome() : getCatsExpense();
  const si = {background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,
    fontFamily:"inherit",fontSize:13,padding:"8px 10px",outline:"none",width:"100%"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <h2 style={{fontSize:22,fontWeight:800}}>Contas a {tab==="expense"?"Pagar":"Receber"}</h2>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" icon="copy" onClick={()=>exportToExcel(list,accounts,contacts,costCenters,`finovo_${tab}_${monthF}`)} small>Excel</Btn>
          <Btn variant="ghost" icon="upload" onClick={()=>exportToCsv(list,accounts,contacts,costCenters,`finovo_${tab}_${monthF}`)} small>CSV</Btn>
          <Btn variant="primary" icon="plus" onClick={onAdd}>Novo Lançamento</Btn>
        </div>
      </div>

      <div style={{display:"flex",gap:0,background:"#f1f3f9",borderRadius:10,padding:4,width:"fit-content"}}>
        {["expense","income"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 24px",borderRadius:7,border:"none",
            fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .15s",
            background:tab===t?C.primary:"transparent",color:tab===t?"#fff":C.muted}}>
            {t==="expense"?"↓ A Pagar":"↑ A Receber"}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[["Total",total,C.primary,C.primaryLight],["Pago/Recebido",paid,C.green,C.greenLight],["Pendente",pending,C.yellow,C.yellowLight]].map(([l,v,c,cl])=>(
          <div key={l} style={{background:cl,borderRadius:10,padding:"12px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:c,letterSpacing:"0.07em",textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c,marginTop:4}}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      <Card style={{padding:"12px 16px"}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."
            style={{...si,width:200,padding:"7px 11px",fontSize:13}} />
          <select value={monthF} onChange={e=>setMonthF(e.target.value)} style={{...si,width:140,padding:"7px 11px",fontSize:13}}>
            <option value="all">Todos os meses</option>
            {BILL_MONTHS.map(m=><option key={m} value={m}>{fmtMonth(m+"-01")}{m>CUR_MONTH?" 🔮":""}</option>)}
          </select>
          <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{...si,width:140,padding:"7px 11px",fontSize:13}}>
            <option value="all">Todos os status</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select value={ccF} onChange={e=>setCcF(e.target.value)} style={{...si,width:150,padding:"7px 11px",fontSize:13}}>
            <option value="all">Centro de custo</option>
            {costCenters.filter(cc=>cc.active).map(cc=><option key={cc.id} value={cc.id}>{cc.icon} {cc.name}</option>)}
          </select>
          <select value={catF} onChange={e=>setCatF(e.target.value)} style={{...si,width:140,padding:"7px 11px",fontSize:13}}>
            <option value="all">Categoria</option>
            {(tab==="income"?getCatsIncome():getCatsExpense()).map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={accF} onChange={e=>setAccF(e.target.value)} style={{...si,width:150,padding:"7px 11px",fontSize:13}}>
            <option value="all">Conta bancária</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {(ccF!=="all"||catF!=="all"||accF!=="all") && (
            <button onClick={()=>{setCcF("all");setCatF("all");setAccF("all");}}
              style={{background:C.redLight,color:C.red,border:"none",borderRadius:7,
                padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              ✕ Limpar filtros
            </button>
          )}
          {selIds.size>0 && (
            <div style={{display:"flex",gap:6,marginLeft:"auto",flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:C.primary,fontWeight:700,alignSelf:"center"}}>{selIds.size} selecionado{selIds.size>1?"s":""}</span>
              <button onClick={()=>setBulkModal(true)}
                style={{background:C.primaryLight,color:C.primary,border:`1px solid ${C.primary}44`,borderRadius:8,
                  padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                ✏️ Editar em lote
              </button>
              <button onClick={()=>{selList.forEach(t=>onMarkPaid(t.id));setSelIds(new Set());}}
                style={{background:C.greenLight,color:C.green,border:"none",borderRadius:8,
                  padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                ✓ Marcar pagos
              </button>
              <button onClick={()=>{if(confirm(`Excluir ${selIds.size} lançamentos?`)){selList.forEach(t=>onDelete(t.id));setSelIds(new Set());}}}
                style={{background:C.redLight,color:C.red,border:"none",borderRadius:8,
                  padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                🗑 Excluir
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f7f8fc"}}>
            <th style={{padding:"11px 16px"}}>
              <input type="checkbox" checked={allSel} onChange={()=>allSel?setSelIds(new Set()):setSelIds(new Set(list.map(t=>t.id)))} />
            </th>
            {["Data","Descrição","Categoria","Contato","Valor","Status","Pago em","Conta",""].map(h=>(
              <th key={h} style={{padding:"11px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {list.length===0 && <tr><td colSpan={9} style={{padding:40,textAlign:"center",color:C.dim,fontSize:13}}>
              {monthF>CUR_MONTH
                ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <span style={{fontSize:32}}>🔮</span>
                    <span style={{fontWeight:600,color:C.muted}}>Nenhum lançamento previsto para este mês</span>
                    <span style={{fontSize:12}}>Lançamentos recorrentes aparecerão aqui automaticamente</span>
                  </div>
                : "Nenhum lançamento encontrado"}
            </td></tr>}
            {list.map((t,i)=>{
              const ct  = getContact(t.contactId);
              const acc = accounts.find(a=>a.id===t.accountId);
              return (
                <tr key={t.id} style={{borderTop:`1px solid ${C.border}`,
                  background:selIds.has(t.id)?"#eff6ff":i%2===0?C.surface:"#fafbfd",transition:"background .1s"}}>
                  <td style={{padding:"10px 16px"}}><input type="checkbox" checked={selIds.has(t.id)} onChange={()=>toggleSel(t.id)} /></td>
                  <td style={{padding:"10px 12px",fontSize:13,color:C.muted,whiteSpace:"nowrap"}}>{fmtDate(t.date)}</td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{fontSize:13,fontWeight:600,maxWidth:170,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                      {t.attachment && <span title={t.attachmentName||"Anexo"} style={{fontSize:14,cursor:"pointer"}} onClick={()=>{const a=document.createElement("a");a.href=t.attachment;a.download=t.attachmentName||"anexo";a.click();}}>📎</span>}
                    </div>
                    {t.recurrenceGroupName && <div style={{fontSize:10,color:C.primary,fontWeight:600,marginTop:2}}>↺ {t.recurrenceGroupName}</div>}
                  </td>
                  <td style={{padding:"10px 12px"}}><span style={{fontSize:11,background:C.primaryLight,color:C.primary,borderRadius:5,padding:"2px 7px",fontWeight:600}}>{t.category}</span></td>
                  <td style={{padding:"10px 12px",fontSize:12,color:C.muted}}>{ct?.name||"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:14,fontWeight:700,color:t.type==="income"?C.green:t.type==="transfer"?"#6c63ff":C.text}}>{t.type==="income"?"+":t.type==="transfer"?"⇄":"-"} {fmt(t.amount)}</td>
                  <td style={{padding:"10px 12px"}}><Badge status={t.status} /></td>
                  <td style={{padding:"10px 12px",fontSize:12,color:t.paidAt?C.green:C.dim,whiteSpace:"nowrap"}}>{t.paidAt?fmtDate(t.paidAt):"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:12,color:C.muted}}>{acc?.name.split(" ")[0]||"—"}</td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:4}}>
                      {t.status!=="pago" && <Btn small variant="success" icon="check" onClick={()=>onMarkPaid(t.id)} />}
                      <span title="Duplicar lançamento"><Btn small variant="ghost" icon="copy" onClick={()=>onDuplicate(t)} /></span>
                      <Btn small variant="ghost" icon="edit" onClick={()=>onEdit(t)} />
                      <Btn small variant="danger" icon="trash" onClick={()=>onDelete(t.id)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* ── Bulk Edit Modal ── */}
      {bulkModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,30,61,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>setBulkModal(false)}>
          <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:520,boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <h3 style={{fontWeight:800,fontSize:17}}>Edição em Lote</h3>
                <p style={{fontSize:12,color:C.muted,marginTop:2}}>{selIds.size} lançamento{selIds.size>1?"s":""} selecionado{selIds.size>1?"s":""} — preencha apenas os campos que deseja alterar</p>
              </div>
              <button onClick={()=>setBulkModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:C.muted}}>×</button>
            </div>
            <div style={{padding:"20px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {/* Date */}
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>📅 Data de vencimento</label>
                <input type="date" value={bulkForm.date||""} onChange={e=>setBulkForm(f=>({...f,date:e.target.value}))} style={si} />
              </div>
              {/* Status */}
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>🔖 Status</label>
                <select value={bulkForm.status||""} onChange={e=>setBulkForm(f=>({...f,status:e.target.value}))} style={si}>
                  <option value="">— não alterar —</option>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="vencido">Vencido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              {/* Type */}
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>↕️ Tipo</label>
                <select value={bulkForm.type||""} onChange={e=>setBulkForm(f=>({...f,type:e.target.value}))} style={si}>
                  <option value="">— não alterar —</option>
                  <option value="expense">↓ Despesa</option>
                  <option value="income">↑ Receita</option>
                </select>
              </div>
              {/* Category */}
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>🏷️ Categoria</label>
                <select value={bulkForm.category||""} onChange={e=>setBulkForm(f=>({...f,category:e.target.value}))} style={si}>
                  <option value="">— não alterar —</option>
                  <optgroup label="Despesas">{getCatsExpense().map(c=><option key={c}>{c}</option>)}</optgroup>
                  <optgroup label="Receitas">{getCatsIncome().map(c=><option key={c}>{c}</option>)}</optgroup>
                </select>
              </div>
              {/* Account */}
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>🏦 Conta bancária</label>
                <select value={bulkForm.accountId||""} onChange={e=>setBulkForm(f=>({...f,accountId:e.target.value}))} style={si}>
                  <option value="">— não alterar —</option>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {/* Cost center */}
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>🎯 Centro de Custo</label>
                <select value={bulkForm.costCenterId!==undefined?bulkForm.costCenterId:""} onChange={e=>setBulkForm(f=>({...f,costCenterId:e.target.value}))} style={si}>
                  <option value="">— não alterar —</option>
                  <option value="__clear__">Remover centro de custo</option>
                  {(costCenters||[]).filter(cc=>cc.active).map(cc=><option key={cc.id} value={cc.id}>{cc.icon} {cc.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{padding:"0 24px 20px",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setBulkModal(false)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,
                padding:"9px 18px",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",color:C.muted}}>Cancelar</button>
              <button onClick={applyBulk} style={{background:`linear-gradient(135deg,${C.primary},#1a6bc4)`,color:"#fff",border:"none",borderRadius:9,
                padding:"9px 20px",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                ✓ Aplicar em {selIds.size} lançamento{selIds.size>1?"s":""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const Cashflow = ({ txs }) => {
  const [viewMode, setViewMode] = useState("chart");
  const monthData = MONTHS.map(m => {
    const mTxs = txs.filter(t => getMonth(t.date) === m);
    const inc  = mTxs.filter(t=>t.type==="income" &&t.status!=="cancelado").reduce((s,t)=>s+t.amount,0);
    const exp  = mTxs.filter(t=>t.type==="expense"&&t.status!=="cancelado").reduce((s,t)=>s+t.amount,0);
    return { month: fmtMonth(m+"-01"), rawMonth: m, income: inc, expense: exp, balance: inc-exp };
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontSize:22, fontWeight:800 }}>Fluxo de Caixa</h2>
        <div style={{ display:"flex", gap:4, background:"#f1f3f9", borderRadius:8, padding:3 }}>
          {["chart","table"].map(v=>(
            <button key={v} onClick={()=>setViewMode(v)} style={{ padding:"6px 14px", borderRadius:6, border:"none", fontFamily:"inherit", fontWeight:600, fontSize:12, cursor:"pointer", background:viewMode===v?C.primary:"transparent", color:viewMode===v?"#fff":C.muted }}>
              {v==="chart"?"Gráfico":"Tabela"}
            </button>
          ))}
        </div>
      </div>

      {viewMode==="chart" ? (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Receitas × Despesas</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize:12, fill:C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:12, fill:C.muted }} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v=>[fmt(v)]} contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:12 }} formatter={v=>v==="income"?"Receitas":"Despesas"} />
                <Bar dataKey="income"  fill={C.green} radius={[6,6,0,0]} name="income" />
                <Bar dataKey="expense" fill={C.red}   radius={[6,6,0,0]} name="expense" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Resultado (Saldo Mensal)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthData}>
                <defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.primary} stopOpacity={0.2}/><stop offset="95%" stopColor={C.primary} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v=>[fmt(v),"Resultado"]} contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }} />
                <Area type="monotone" dataKey="balance" stroke={C.primary} fill="url(#gb)" strokeWidth={2.5} dot={{ fill:C.primary, r:4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ) : (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#f7f8fc" }}>
              {["Mês","Receitas","Despesas","Resultado","% Economia"].map(h=>(
                <th key={h} style={{ padding:"12px 16px", textAlign:h==="Mês"?"left":"right", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {monthData.map((r,i)=>(
                <tr key={i} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?C.surface:"#fafbfd" }}>
                  <td style={{ padding:"12px 16px", fontWeight:700 }}>{r.month}</td>
                  <td style={{ padding:"12px 16px", textAlign:"right", color:C.green, fontWeight:700 }}>{fmt(r.income)}</td>
                  <td style={{ padding:"12px 16px", textAlign:"right", color:C.red, fontWeight:700 }}>{fmt(r.expense)}</td>
                  <td style={{ padding:"12px 16px", textAlign:"right", fontWeight:700, color:r.balance>=0?C.green:C.red }}>{fmt(r.balance)}</td>
                  <td style={{ padding:"12px 16px", textAlign:"right", fontSize:13, color:C.muted }}>{r.income>0?((r.balance/r.income)*100).toFixed(1)+"%" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
//  ACCOUNTS
const Accounts = ({ accounts, txs, onAdd, onEdit, onDelete }) => {
  const blank = { id:uid(), name:"", bank:"", type:"corrente", balance:"", color:"#6c63ff" };
  const [form,      setForm]      = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [selMonth,  setSelMonth]  = useState(CUR_MONTH);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const openNew  = () => { setForm({...blank,id:uid()}); setEditingId("new"); };
  const openEdit = a  => { setForm({...a, balance:String(a.balance)}); setEditingId(a.id); };
  const cancel   = () => { setForm(blank); setEditingId(null); };

  const save = () => {
    if(!form.name||!form.bank){ alert("Preencha nome e banco."); return; }
    onAdd({ ...form, balance: parseFloat(form.balance||0) });
    setForm(blank); setEditingId(null);
  };

  const monthIdx   = BILL_MONTHS.indexOf(selMonth);
  const prevMonth  = monthIdx > 0 ? BILL_MONTHS[monthIdx-1] : null;
  const nextMonth  = monthIdx < BILL_MONTHS.length-1 ? BILL_MONTHS[monthIdx+1] : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <h2 style={{ fontSize:22, fontWeight:800 }}>Contas Bancárias</h2>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Navegador de mês */}
          <div style={{ display:"flex", alignItems:"center", gap:4, background:"#eef1f8", borderRadius:10, padding:"4px 8px" }}>
            <button onClick={()=>prevMonth&&setSelMonth(prevMonth)} disabled={!prevMonth}
              style={{ background:"none", border:"none", cursor:prevMonth?"pointer":"default", fontSize:16,
                       color:prevMonth?C.text:C.dim, padding:"0 4px", opacity:prevMonth?1:.3 }}>‹</button>
            <span style={{ fontSize:13, fontWeight:700, color:C.primary, minWidth:90, textAlign:"center" }}>
              {fmtMonth(selMonth+"-01")}{selMonth>CUR_MONTH?" 🔮":""}
            </span>
            <button onClick={()=>nextMonth&&setSelMonth(nextMonth)} disabled={!nextMonth}
              style={{ background:"none", border:"none", cursor:nextMonth?"pointer":"default", fontSize:16,
                       color:nextMonth?C.text:C.dim, padding:"0 4px", opacity:nextMonth?1:.3 }}>›</button>
          </div>
          {!editingId && <Btn variant="primary" icon="plus" onClick={openNew}>Nova Conta</Btn>}
        </div>
      </div>

      {editingId && (
        <Card style={{borderTop:`3px solid ${C.primary}`}}>
          <h3 style={{ fontWeight:700, marginBottom:14 }}>{editingId==="new"?"Nova Conta Bancária":"✏️ Editar Conta"}</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Nome da Conta" half><Input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: Conta Corrente Nubank" /></Field>
            <Field label="Banco" half><Input value={form.bank} onChange={e=>set("bank",e.target.value)} placeholder="Ex: Nubank" /></Field>
            <Field label="Tipo" half>
              <Select value={form.type} onChange={e=>set("type",e.target.value)}>
                {["corrente","poupança","cartão","investimento","caixa","outro"].map(t=><option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label={editingId==="new"?"Saldo Inicial (R$)":"Saldo Atual (R$)"} half>
              <Input type="number" value={form.balance} onChange={e=>set("balance",e.target.value)} placeholder="0,00" />
            </Field>
            <Field label="Cor" half><Input type="color" value={form.color} onChange={e=>set("color",e.target.value)} style={{ ...inp, height:42, padding:4 }} /></Field>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn variant="ghost" onClick={cancel}>Cancelar</Btn>
            <Btn variant="primary" icon="check" onClick={save}>Salvar</Btn>
          </div>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {accounts.map(a => {
          // Todas as transações da conta no mês selecionado
          const mesATxs  = txs.filter(t=>t.accountId===a.id && getMonth(t.date)===selMonth && t.status!=="cancelado");
          const mesInc   = mesATxs.filter(t=>t.type==="income" ).reduce((s,t)=>s+t.amount,0);
          const mesExp   = mesATxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
          const mesPend  = mesATxs.filter(t=>t.type==="expense"&&(t.status==="pendente"||t.status==="vencido")).reduce((s,t)=>s+t.amount,0);
          const mesVenc  = mesATxs.filter(t=>t.status==="vencido").length;

          // Saldo calculado (histórico completo, só pagos)
          const allPaid  = txs.filter(t=>t.accountId===a.id&&t.status==="pago");
          const incPago  = allPaid.filter(t=>t.type==="income" ).reduce((s,t)=>s+t.amount,0);
          const expPago  = allPaid.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
          const saldoAtual = a.balance + incPago - expPago;

          return (
            <Card key={a.id} style={{ borderLeft:`4px solid ${a.color}` }}>
              {/* Cabeçalho */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:a.color+"22", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="wallet" size={20} color={a.color} /></div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{a.name}</div>
                    <div style={{ fontSize:12, color:C.muted }}>{a.bank} · {a.type}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  <Btn small variant="ghost" icon="edit" onClick={()=>openEdit(a)} />
                  <Btn small variant="danger" icon="trash" onClick={()=>onDelete(a.id)} />
                </div>
              </div>

              {/* Saldo atual */}
              <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:2 }}>Saldo atual</div>
              <div style={{ fontSize:22, fontWeight:800, color:saldoAtual<0?C.red:C.text, marginBottom:12 }}>{fmt(saldoAtual)}</div>

              {/* Resumo do mês */}
              <div style={{ background:"#f5f7fb", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
                <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                  {fmtMonth(selMonth+"-01")}{selMonth>CUR_MONTH?" 🔮":""}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:C.green, fontWeight:600, textTransform:"uppercase" }}>Receitas</div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.green }}>{fmt(mesInc)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.red, fontWeight:600, textTransform:"uppercase" }}>Despesas</div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.red }}>{fmt(mesExp)}</div>
                  </div>
                </div>
              </div>

              {/* A pagar no mês */}
              {mesPend > 0 && (
                <div style={{ background:C.redLight, borderRadius:8, padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:10, color:C.red, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" }}>A Pagar{mesVenc>0?` · ${mesVenc} vencido${mesVenc>1?"s":""}`:""}</div>
                    <div style={{ fontSize:16, fontWeight:800, color:C.red }}>{fmt(mesPend)}</div>
                  </div>
                  {mesVenc > 0 && <span style={{ fontSize:18 }}>⚠️</span>}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
//  CONTACTS
const Contacts = ({ contacts, txs, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const blank = { id:uid(), name:"", type:"cliente", email:"", phone:"", notes:"" };
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const list = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <h2 style={{ fontSize:22, fontWeight:800 }}>Contatos</h2>
        <Btn variant="primary" icon="plus" onClick={()=>setShowForm(true)}>Novo Contato</Btn>
      </div>

      {showForm && (
        <Card>
          <h3 style={{ fontWeight:700, marginBottom:14 }}>Novo Contato</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Nome" half={false}><Input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Nome completo" /></Field>
            <Field label="Tipo" half>
              <Select value={form.type} onChange={e=>set("type",e.target.value)}>
                <option value="cliente">Cliente</option><option value="fornecedor">Fornecedor</option><option value="funcionário">Funcionário</option><option value="outro">Outro</option>
              </Select>
            </Field>
            <Field label="E-mail" half><Input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="email@exemplo.com" /></Field>
            <Field label="Telefone" half><Input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="(11) 99999-9999" /></Field>
            <Field label="Observações" half={false}><Textarea value={form.notes} onChange={e=>set("notes",e.target.value)} /></Field>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn variant="ghost" onClick={()=>{ setShowForm(false); setForm(blank); }}>Cancelar</Btn>
            <Btn variant="primary" icon="check" onClick={()=>{ if(!form.name){ alert("Nome é obrigatório."); return; } onAdd(form); setForm(blank); setShowForm(false); }}>Salvar</Btn>
          </div>
        </Card>
      )}

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar contato..." style={{ ...inp, maxWidth:280 }} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {list.map(c=>{
          const cTxs = txs.filter(t=>t.contactId===c.id);
          const total = cTxs.reduce((s,t)=>(t.type==="income"?s+t.amount:s-t.amount),0);
          const typeMap = { cliente:C.blue, fornecedor:C.yellow, funcionário:C.green, outro:C.muted };
          return (
            <Card key={c.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:typeMap[c.type]+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:typeMap[c.type] }}>{c.name[0]}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
                    <span style={{ fontSize:10, background:typeMap[c.type]+"22", color:typeMap[c.type], borderRadius:5, padding:"1px 7px", fontWeight:700, textTransform:"capitalize" }}>{c.type}</span>
                  </div>
                </div>
                <Btn small variant="danger" icon="trash" onClick={()=>onDelete(c.id)} />
              </div>
              {c.email && <div style={{ fontSize:12, color:C.muted, marginBottom:3 }}>📧 {c.email}</div>}
              {c.phone && <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>📞 {c.phone}</div>}
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, color:C.muted }}>{cTxs.length} transações</span>
                <span style={{ fontSize:13, fontWeight:700, color:total>=0?C.green:C.red }}>{fmt(Math.abs(total))}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
//  REPORTS
const Reports = ({ txs, accounts, contacts, costCenters }) => {
  const [reportType, setReportType] = useState("dre");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const allMonths = Array.from({ length:12 }, (_,i) => `${year}-${String(i+1).padStart(2,"0")}`);
  const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  const dreData = allMonths.map((m,i) => {
    const mTxs = txs.filter(t=>getMonth(t.date)===m&&t.status!=="cancelado");
    const inc  = mTxs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    const exp  = mTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    return { month:monthNames[i], income:inc, expense:exp, result:inc-exp };
  });

  const catData = {};
  txs.filter(t=>t.type==="expense"&&t.status!=="cancelado"&&getMonth(t.date).startsWith(year)).forEach(t=>{
    catData[t.category]=(catData[t.category]||0)+t.amount;
  });
  const catArr = Object.entries(catData).map(([cat,v])=>({ cat, value:v })).sort((a,b)=>b.value-a.value);
  const catTotal = catArr.reduce((s,r)=>s+r.value,0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <h2 style={{ fontSize:22, fontWeight:800 }}>Relatórios</h2>
        <div style={{ display:"flex", gap:8 }}>
          <Select value={year} onChange={e=>setYear(e.target.value)} style={{ ...inp, width:100, padding:"7px 11px" }}>
            {[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
          </Select>
          <Btn variant="ghost" icon="copy" small onClick={()=>exportAllToExcel(txs,accounts,contacts,costCenters,year)}>Excel</Btn>
          <Btn variant="ghost" icon="upload" small onClick={()=>{const l=txs.filter(t=>t.date.startsWith(year));exportToCsv(l,accounts,contacts,costCenters,`finovo_${year}`);}}>CSV</Btn>
        </div>
      </div>

      {/* Report type tabs */}
      <div style={{ display:"flex", gap:8, borderBottom:`2px solid ${C.border}`, paddingBottom:0 }}>
        {[["dre","DRE — Resultado"],["categories","Por Categoria"],["comparison","Comparativo Mensal"]].map(([v,l])=>(
          <button key={v} onClick={()=>setReportType(v)} style={{ padding:"9px 18px", border:"none", background:"transparent", fontFamily:"inherit", fontWeight:700, fontSize:13, cursor:"pointer", color:reportType===v?C.primary:C.muted, borderBottom:`2px solid ${reportType===v?C.primary:"transparent"}`, marginBottom:-2, transition:"all .15s" }}>{l}</button>
        ))}
      </div>

      {reportType==="dre" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
            <h3 style={{ fontWeight:700 }}>Demonstrativo de Resultados — {year}</h3>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#f7f8fc" }}>
              {["Mês","Receitas","Despesas","Resultado","Margem %"].map(h=><th key={h} style={{ padding:"11px 16px", textAlign:h==="Mês"?"left":"right", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {dreData.map((r,i)=>(
                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:"11px 16px", fontWeight:600 }}>{r.month}</td>
                  <td style={{ padding:"11px 16px", textAlign:"right", color:C.green, fontWeight:700 }}>{fmt(r.income)}</td>
                  <td style={{ padding:"11px 16px", textAlign:"right", color:C.red, fontWeight:700 }}>{fmt(r.expense)}</td>
                  <td style={{ padding:"11px 16px", textAlign:"right", fontWeight:700, color:r.result>=0?C.green:C.red }}>{fmt(r.result)}</td>
                  <td style={{ padding:"11px 16px", textAlign:"right", fontSize:13, color:C.muted }}>{r.income>0?((r.result/r.income)*100).toFixed(1)+"%":"—"}</td>
                </tr>
              ))}
              <tr style={{ borderTop:`2px solid ${C.border}`, background:"#f7f8fc" }}>
                <td style={{ padding:"11px 16px", fontWeight:800 }}>TOTAL {year}</td>
                <td style={{ padding:"11px 16px", textAlign:"right", fontWeight:800, color:C.green }}>{fmt(dreData.reduce((s,r)=>s+r.income,0))}</td>
                <td style={{ padding:"11px 16px", textAlign:"right", fontWeight:800, color:C.red }}>{fmt(dreData.reduce((s,r)=>s+r.expense,0))}</td>
                <td style={{ padding:"11px 16px", textAlign:"right", fontWeight:800, color:dreData.reduce((s,r)=>s+r.result,0)>=0?C.green:C.red }}>{fmt(dreData.reduce((s,r)=>s+r.result,0))}</td>
                <td style={{ padding:"11px 16px", textAlign:"right" }}>—</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {reportType==="categories" && (
        <Card>
          <h3 style={{ fontWeight:700, marginBottom:16 }}>Despesas por Categoria — {year}</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {catArr.map((r,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:120, fontSize:13, fontWeight:600, flexShrink:0 }}>{r.cat}</div>
                <div style={{ flex:1, background:"#f1f3f9", borderRadius:6, height:28, overflow:"hidden", position:"relative" }}>
                  <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${catTotal>0?(r.value/catTotal*100):0}%`, background:C.primary, borderRadius:6, transition:"width .5s" }} />
                </div>
                <div style={{ width:90, textAlign:"right", fontSize:13, fontWeight:700 }}>{fmt(r.value)}</div>
                <div style={{ width:44, textAlign:"right", fontSize:12, color:C.muted }}>{catTotal>0?((r.value/catTotal)*100).toFixed(0)+"%":"0%"}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {reportType==="comparison" && (
        <Card>
          <h3 style={{ fontWeight:700, marginBottom:16 }}>Comparativo Mensal — {year}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dreData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize:12, fill:C.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12, fill:C.muted }} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v=>[fmt(v)]} contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }} />
              <Legend wrapperStyle={{ fontSize:12 }} formatter={v=>v==="income"?"Receitas":v==="expense"?"Despesas":"Resultado"} />
              <Bar dataKey="income"  fill={C.green} radius={[4,4,0,0]} name="income" />
              <Bar dataKey="expense" fill={C.red}   radius={[4,4,0,0]} name="expense" />
              <Bar dataKey="result"  fill={C.primary} radius={[4,4,0,0]} name="result" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};
//  PDF IMPORT via Claude AI
// ─────────────────────────────────────────────
//  IMPORT PAGE — tudo em uma tela
const smartMatch=(d,t)=>{if(!d||!t?.length)return{};const m=t.filter(x=>(x.desc||'').toLowerCase()===d.toLowerCase()).sort((a,b)=>b.date.localeCompare(a.date));return m.length?{category:m[0].category||'',accountId:m[0].accountId||'',costCenterId:m[0].costCenterId||''}:{};};
const ImportPage = ({ accounts, contacts, costCenters, onImport }) => {

  // ── state ──────────────────────────────────
  const [tab,      setTab]      = useState("sheet"); // "sheet" | "pdf"
  const [itype,    setItype]    = useState("expense");
  const [drag,     setDrag]     = useState(false);
  const [filename, setFilename] = useState("");
  const [error,    setError]    = useState("");

  // Sheet parsing
  const [headers,  setHeaders]  = useState([]);  // ["Data","Desc","Valor",...]
  const [rawRows,  setRawRows]  = useState([]);  // raw string rows
  const [mapDate,     setMapDate]     = useState(-1);
  const [mapDesc,     setMapDesc]     = useState(-1);
  const [mapVal,      setMapVal]      = useState(-1);
  const [mapCat,      setMapCat]      = useState(-1);
  const [mapAccCol,   setMapAccCol]   = useState(-1);  // coluna com nome da conta
  const [mapCCCol,    setMapCCCol]    = useState(-1);  // coluna com nome do centro de custo
  const [mapParcelas, setMapParcelas] = useState(-1);  // coluna com qtd de parcelas
  const [mapAcc,      setMapAcc]      = useState(accounts[0]?.id || "");
  const [skipKw,      setSkipKw]      = useState("SALDO,TOTAL,PAGAMENTO,ANTERIOR");

  // Preview / edit rows (after mapping applied)
  const [rows,     setRows]     = useState([]); // {id,date,desc,amount,type,category,keep}
  const [done,     setDone]     = useState(null); // {imported,duplicates,skipped}

  // PDF state
  const [pdfStatus, setPdfStatus] = useState("idle"); // idle|loading|review|error
  const [pdfErr,    setPdfErr]    = useState("");
  const [pdfRows,   setPdfRows]   = useState([]);
  const [pdfInfo,   setPdfInfo]   = useState(null);

  const CATS = itype === "income" ? CATS_INCOME : CATS_EXPENSE;

  // ── helpers ────────────────────────────────
  const parseAmt = s => {
    if (s === null || s === undefined || s === "") return null;
    // Número JS direto (raw:true)
    if (typeof s === "number") return isNaN(s) ? null : s;
    let v = String(s).replace(/[R$\s"']/g, "").trim();
    if (/\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) v = v.replace(/\./g, "").replace(",", ".");
    else v = v.replace(",", ".");
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const parseDt = raw => {
    if (!raw && raw !== 0) return tod();
    // Objeto Date nativo (raw:true + cellDates:true)
    if (raw instanceof Date) return isNaN(raw) ? tod() : raw.toISOString().slice(0, 10);
    // Número: serial Excel (raw:true sem cellDates) ou número puro
    if (typeof raw === "number") {
      if (raw > 40000 && raw < 60000) {
        const d = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
        return isNaN(d) ? tod() : d.toISOString().slice(0, 10);
      }
      return tod();
    }
    const s = String(raw).trim();
    if (!s) return tod();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // DD/MM/YYYY ou DD/MM/YY
    const m1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (m1) {
      const y = m1[3].length === 2 ? "20" + m1[3] : m1[3];
      // se o 3º grupo ≥ 1900 → é ano → DD/MM/YYYY
      if (parseInt(y) >= 1900) return `${y}-${m1[2].padStart(2,"0")}-${m1[1].padStart(2,"0")}`;
    }
    // String numérica de serial Excel
    if (/^\d{4,5}$/.test(s)) {
      const n = parseInt(s);
      if (n > 40000 && n < 60000) {
        const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
        return isNaN(d) ? tod() : d.toISOString().slice(0, 10);
      }
    }
    const d = new Date(s);
    return isNaN(d) ? tod() : d.toISOString().slice(0, 10);
  };

  const reset = () => {
    setFilename(""); setError(""); setHeaders([]); setRawRows([]);
    setRows([]); setDone(null);
    setMapDate(-1); setMapDesc(-1); setMapVal(-1); setMapCat(-1);
    setMapAccCol(-1); setMapCCCol(-1); setMapParcelas(-1);
    setPdfStatus("idle"); setPdfErr(""); setPdfRows([]); setPdfInfo(null);
  };

  // ── SHEET: read file ────────────────────────
  const readSheet = file => {
    if (!file) return;
    setError(""); setDone(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const XLSX = window.XLSX;
        if (!XLSX) { setError("Biblioteca SheetJS não carregada. Recarregue a página."); return; }
        const wb  = XLSX.read(new Uint8Array(e.target.result), { type:"array", cellDates:true, cellNF:true });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const all = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, cellDates:true, defval:"" });

        // find first non-empty row = header
        let hi = 0;
        for (let i = 0; i < Math.min(15, all.length); i++) {
          if (all[i].some(c => c !== null && c !== undefined && String(c).trim() !== "")) { hi = i; break; }
        }
        const hdr  = (all[hi] || []).map((h, i) => h && String(h).trim() ? String(h).trim() : `Coluna ${i+1}`);
        const body = all.slice(hi + 1).filter(r => r.some(c => c !== null && c !== undefined && String(c).trim() !== ""));

        setFilename(file.name);
        setHeaders(hdr);
        setRawRows(body);

        // auto-detect columns
        const lw  = hdr.map(h => h.toLowerCase());
        const find = (...terms) => { for (const t of terms) { const i = lw.findIndex(h => h.includes(t)); if (i >= 0) return i; } return -1; };
        const d  = find("vencim","data","date","dt","dia");
        const ds = find("descri","histor","lancam","memo","estabele","merchant","benefic","nome","título");
        const vl = find("valor","value","amount","débito","debito","crédito","credito","montante","transac");
        const ct = find("categ","grupo","group","classif");
        const ac = find("conta","bank","account","banco");
        const cc = find("centro","custo","cost","depart");
        const pr = find("parcela","vezes","quantas","installment");
        setMapDate(d); setMapDesc(ds); setMapVal(vl); setMapCat(ct);
        setMapAccCol(ac); setMapCCCol(cc); setMapParcelas(pr);

        // apply mapping immediately if found
        if (d >= 0 && ds >= 0 && vl >= 0) {
          applyMapping(body, hdr, d, ds, vl, ct, ac, cc, pr);
        }
      } catch(err) {
        setError("Erro ao ler arquivo: " + err.message);
      }
    };
    reader.onerror = () => setError("Falha ao ler o arquivo.");
    reader.readAsArrayBuffer(file);
  };

  // ── SHEET: build preview rows from mapping ──
  const applyMapping = (body, hdr, mD, mDs, mV, mC, mAc, mCC, mPr) => {
    const skip = skipKw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

    // resolve nome → id (case-insensitive, partial match fallback)
    const resolveAcc = name => {
      if (!name) return { id: mapAcc, matched: true };
      const n = name.toLowerCase().trim();
      const found = accounts.find(a => a.name.toLowerCase().trim() === n)
                 || accounts.find(a => a.name.toLowerCase().includes(n) || n.includes(a.name.toLowerCase()));
      return { id: found?.id ?? mapAcc, matched: !!found };
    };
    const resolveCC = name => {
      if (!name) return "";
      const n = name.toLowerCase().trim();
      return ((costCenters||[]).find(c => c.name.toLowerCase().trim() === n)
           || (costCenters||[]).find(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase())))
             ?.id ?? "";
    };

    const built = [];
    (body || rawRows).forEach((row, i) => {
      const descRaw = String(row[mDs] ?? "").trim();
      if (!descRaw) return;
      if (skip.some(sw => descRaw.toLowerCase().includes(sw))) return;
      const amt = parseAmt(String(row[mV] ?? ""));
      if (amt === null || amt === 0) return;
      const parcelas   = mPr  >= 0 ? (parseInt(String(row[mPr]  ?? "").trim()) || 1) : 1;
      const accName    = mAc  >= 0 ? String(row[mAc]  ?? "").trim() : "";
      const ccName     = mCC  >= 0 ? String(row[mCC]  ?? "").trim() : "";
      const accRes     = resolveAcc(accName);
      built.push({
        _idx:           i,
        id:             uid(),
        keep:           true,
        date:           parseDt(row[mD]),
        desc:           descRaw,
        amount:         Math.abs(amt),
        type:           itype,
        category:       mC >= 0 ? (String(row[mC] ?? "").trim() || "Outros") : "Outros",
        accountId:      accRes.id,
        accountName:    accName,
        accountMatched: accRes.matched,
        costCenterId:   resolveCC(ccName),
        costCenterName: ccName,
        status:         "pendente",
        parcelas:       Math.min(Math.max(parcelas, 1), 60),
      });
    });
    setRows(built);
  };

  // Re-apply when mapping changes
  const handleApply = () => {
    if (mapDate < 0 || mapDesc < 0 || mapVal < 0) {
      setError("Selecione ao menos as colunas de Data, Descrição e Valor.");
      return;
    }
    setError("");
    applyMapping(rawRows, headers, mapDate, mapDesc, mapVal, mapCat, mapAccCol, mapCCCol, mapParcelas);
  };

  const updateRow  = (id, field, value) => setRows(rs => rs.map(r => r.id === id ? {...r, [field]: value} : r));
  const removeRow  = (id) => setRows(rs => rs.map(r => r.id === id ? {...r, keep:false} : r));
  const restoreRow = (id) => setRows(rs => rs.map(r => r.id === id ? {...r, keep:true} : r));
  const toggleAll  = (val) => setRows(rs => rs.map(r => ({...r, keep:val})));

  // ── Bulk edit for import preview ─────────────────────────────────────────────
  const [bulkImport, setBulkImport] = useState({
    date:"", type:"", category:"", accountId:"", costCenterId:"", status:""
  });
  const applyBulkImport = () => {
    setRows(rs => rs.map(r => {
      if (!r.keep) return r;
      return {
        ...r,
        ...(bulkImport.date       ? {date:     bulkImport.date}                   : {}),
        ...(bulkImport.type       ? {type:     bulkImport.type}                   : {}),
        ...(bulkImport.category   ? {category: bulkImport.category}               : {}),
        ...(bulkImport.accountId  ? {rowAccountId: bulkImport.accountId}          : {}),
        ...(bulkImport.costCenterId !== undefined && bulkImport.costCenterId !== ""
            ? {costCenterId: bulkImport.costCenterId === "__clear__" ? "" : bulkImport.costCenterId}
            : {}),
        ...(bulkImport.status     ? {status:   bulkImport.status}                 : {}),
      };
    }));
    setBulkImport({date:"",type:"",category:"",accountId:"",costCenterId:"",status:""});
  };

  // ── SHEET: confirm import ───────────────────
  const confirmImport = () => {
    const addMonths = (iso, n) => {
      const d = new Date(iso + "T12:00:00Z");
      d.setUTCMonth(d.getUTCMonth() + n);
      return d.toISOString().slice(0, 10);
    };

    const toImport = [];
    rows.filter(r => r.keep).forEach(r => {
      const amt = parseFloat(r.amount) || 0;
      if (amt <= 0 || !r.desc) return;
      const total   = r.parcelas || 1;
      const groupId = total > 1 ? crypto.randomUUID() : null;
      for (let idx = 0; idx < total; idx++) {
        toImport.push({
          id:                   uid(),
          desc:                 total > 1 ? `${r.desc} (${idx + 1}/${total})` : r.desc,
          amount:               amt,
          type:                 r.type,
          category:             r.category,
          date:                 addMonths(r.date, idx),
          status:               idx === 0 ? r.status : "pendente",
          accountId:            r.accountId || mapAcc,
          costCenterId:         r.costCenterId || "",
          contactId:            "",
          recurrenceGroupId:    groupId,
          recurrenceIndex:      total > 1 ? idx + 1 : null,
          recurrenceTotal:      total > 1 ? total   : null,
          notes:                "",
          source:               filename,
        });
      }
    });

    if (toImport.length === 0) { setError("Nenhuma linha válida selecionada."); return; }
    const result = onImport(toImport);
    setDone({ imported: result.imported, duplicates: result.duplicates, skipped: rows.filter(r=>!r.keep).length });
  };

  // ── PDF: carrega PDF.js dinamicamente ────────
  const loadPdfJs = () => new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error("Falha ao carregar PDF.js"));
    document.head.appendChild(s);
  });

  // ── Extrai texto de todas as páginas do PDF ──
  const extractPdfText = async (file) => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Agrupa itens por linha (y aproximado) para reconstruir linhas corretamente
      const items = content.items.map(it => ({
        text: it.str,
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
      }));
      const byY = {};
      items.forEach(it => {
        const key = it.y;
        if (!byY[key]) byY[key] = [];
        byY[key].push(it);
      });
      const lines = Object.keys(byY)
        .sort((a,b) => b - a)
        .map(y => byY[y].sort((a,b) => a.x - b.x).map(it => it.text).join(" ").trim())
        .filter(Boolean);
      fullText += lines.join("\n") + "\n";
    }
    return fullText;
  };

  // ── Detecta banco e parseia transações ───────
  const parsePdfTransactions = (rawText, filename) => {
    // Normaliza texto do PDF.js que insere espaços extras entre caracteres (formato XP e outros)
    const text = rawText
      .replace(/(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{2,4})/g, "$1/$2/$3")   // datas
      .replace(/(\d{1,2})\s*:\s*(\d{2})\s*:\s*(\d{2})/g, "$1:$2:$3")     // horas
      .replace(/R\s*\$\s*/g, "R$")                                         // R$ sem espaço
      .replace(/-\s*R\$/g, "-R$")                                          // -R$ junto
      .replace(/(\d)\s*\.\s*(\d{3})/g, "$1.$2")                           // milhares: 1.234
      .replace(/(\d)\s*,\s*(\d)/g, "$1,$2")                               // decimais: 8,19
      .replace(/\s+\./g, ".");                                              // "Ltda ." → "Ltda."

    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    // Detecta banco pelo conteúdo
    const textLower = text.toLowerCase();
    let bank = "Extrato";
    if (textLower.includes("nubank"))       bank = "Nubank";
    else if (textLower.includes("banco xp") || textLower.includes("xp s.a")) bank = "Banco XP";
    else if (textLower.includes("itaú") || textLower.includes("itau"))  bank = "Itaú";
    else if (textLower.includes("bradesco"))  bank = "Bradesco";
    else if (textLower.includes("santander")) bank = "Santander";
    else if (textLower.includes("inter"))     bank = "Banco Inter";
    else if (textLower.includes("c6"))        bank = "C6 Bank";
    else if (textLower.includes("sicredi"))   bank = "Sicredi";
    else if (textLower.includes("btg"))       bank = "BTG";

    const transactions = [];

    // ── Formato Banco XP / extrato padrão ───────────────────────────────
    // Linha: "29/06/26 às 10:11:05 Pix enviado para Alguém -R$ 8,19 R$ 241,13"
    // ou:    "29/06/26 às 10:11:05 Pix recebido de Alguém R$ 1.000,00 R$ 5.000,00"
    const xpPattern = /^(\d{2}\/\d{2}\/\d{2,4})(?:\s+às\s+\d{2}:\d{2}:\d{2})?\s+(.+?)\s+([-−]?R\$\s*[\d.,]+)\s+R\$\s*[\d.,]+\s*$/;

    // ── Formato compacto sem hora ────────────────────────────────────────
    // "29/06/2026 Descrição -100,00 200,00"
    const compactPattern = /^(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([-−]?[\d.,]+)\s+[-−]?[\d.,]+\s*$/;

    const skipWords = ["data","descrição","descricao","valor","saldo","extrato","periodo","período",
      "saldo anterior","saldo disponível","total","fatura","vencimento","limite","pagamento mínimo",
      "pagamento minimo","extrato simples","importante","banco xp","av.","cnpj","atendimento"];

    const parseValor = v => {
      const s = v.replace(/[R$\s−]/g,"").replace(/\./g,"").replace(",",".");
      return parseFloat(s) || 0;
    };

    const parseDateBR = d => {
      const parts = d.split("/");
      if (parts.length !== 3) return null;
      const day = parts[0].padStart(2,"0");
      const mon = parts[1].padStart(2,"0");
      const yr  = parts[2].length === 2 ? "20"+parts[2] : parts[2];
      return `${yr}-${mon}-${day}`;
    };

    // Junta linhas que são continuação (sem data no início)
    // PDF.js pode separar a mesma transação em múltiplas linhas
    const mergedLines = [];
    // Padrão de data isolada (pode vir com hora na mesma linha ou não)
    const dateOnlyRe = /^\d{2}\/\d{2}\/\d{2,4}$/;
    const dateStartRe = /^\d{2}\/\d{2}\/\d{2,4}/;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (dateStartRe.test(line)) {
        mergedLines.push(line);
      } else if (mergedLines.length > 0 && line.length > 0) {
        const lower = line.toLowerCase();
        // Não junta cabeçalhos ou linhas de separação
        if (/^(data|descrição|valor|saldo|extrato|banco|período|cnpj)/i.test(line)) continue;
        if (/^[-=_]{3,}/.test(line)) continue;
        // Junta como continuação da linha anterior
        mergedLines[mergedLines.length-1] += " " + line;
      }
    }

    for (const line of mergedLines) {
      const lower = line.toLowerCase();
      if (skipWords.some(w => lower.startsWith(w))) continue;
      if (lower.length < 10) continue;

      let date = null, desc = "", valor = 0;

      // Tenta padrão XP
      const m1 = line.match(xpPattern);
      if (m1) {
        date  = parseDateBR(m1[1]);
        desc  = m1[2].trim();
        valor = parseValor(m1[3]);
      } else {
        const m2 = line.match(compactPattern);
        if (m2) {
          date  = parseDateBR(m2[1]);
          desc  = m2[2].trim();
          valor = parseValor(m2[3]);
          if (line.includes("-")) valor = -Math.abs(valor);
        }
      }

      if (!date || !desc || valor === 0) continue;
      if (skipWords.some(w => desc.toLowerCase().includes(w) && desc.length < 30)) continue;

      const isIncome = valor > 0;
      const absAmt   = Math.abs(valor);

      // Categoria automática por palavras-chave
      const dl = desc.toLowerCase();
      let category = "Outros";
      if (/amazon|americanas|magazine|mercado|supermercado|carrefour|atacadão|hortifruti|ifood|rappi/.test(dl)) category = "Alimentação";
      else if (/uber|99|taxi|combustível|combustivel|posto|shell|petrobras|estacionamento/.test(dl)) category = "Transporte";
      else if (/aluguel|condomínio|condominio|iptu|luz|energia|água|agua|gas|internet|telefone/.test(dl)) category = "Moradia";
      else if (/farmácia|farmacia|drogaria|hospital|médico|medico|clinica|saúde|saude/.test(dl)) category = "Saúde";
      else if (/escola|faculdade|curso|educação|educacao|livro/.test(dl)) category = "Educação";
      else if (/netflix|spotify|disney|prime|youtube|assinatura|streaming/.test(dl)) category = "Assinaturas";
      else if (/shopping|roupa|vestuário|vestuario|calçado/.test(dl)) category = "Vestuário";
      else if (/bar|restaurante|lanchonete|padaria|café|cafe/.test(dl)) category = "Alimentação";
      else if (/farmácia|farmacia/.test(dl)) category = "Saúde";
      else if (isIncome && /salário|salario|pagamento|transferência|transferencia|pix recebido|ted recebida/.test(dl)) category = "Salário";

      transactions.push({
        id: uid(), keep: true,
        date, desc,
        amount: absAmt,
        type:   isIncome ? "income" : "expense",
        category,
        costCenterId: "",
        status: "pago",
        accountId: mapAcc,
      });
    }

    // Período extraído do texto
    const periodMatch = text.match(/De:\s*(\d{2}\/\d{2}\/\d{4})\s+Até:\s*(\d{2}\/\d{2}\/\d{4})/);
    const period = periodMatch ? `${periodMatch[1]} a ${periodMatch[2]}` : "";
    const total = transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

    return { bank, period, total, transactions };
  };

  // ── PDF: analyze ────────────────────────────
  const analyzePdf = async file => {
    if (!file) return;
    setPdfStatus("loading"); setPdfErr(""); setFilename(file.name);
    try {
      const text   = await extractPdfText(file);
      console.log("[PDF] Texto extraído (primeiros 2000 chars):\n", text.slice(0,2000));
      const result = parsePdfTransactions(text, file.name);
      if (result.transactions.length === 0) {
        setPdfErr("Nenhuma transação encontrada. Certifique-se de que o arquivo é um extrato bancário em PDF texto (não escaneado).");
        setPdfStatus("idle");
        return;
      }
      setPdfInfo({ bank: result.bank, period: result.period, total: result.total });
      setPdfRows(result.transactions);
      setPdfStatus("review");
    } catch(err) {
      console.error("PDF parse error:", err);
      setPdfErr("Erro ao ler o PDF: " + err.message);
      setPdfStatus("idle");
    }
  };

  const confirmPdfImport = async () => {
    const toImport = pdfRows.filter(r=>r.keep).map(r=>({
      ...r, source:filename, contactId:"", recurrenceGroupId:null,
      recurrenceIndex:null, recurrenceTotal:null, notes:"",
    }));
    const result = await onImport(toImport, null, filename);
    setDone({ imported:result?.imported||toImport.length, duplicates:0, skipped:pdfRows.filter(r=>!r.keep).length });
    setPdfStatus("done");
  };

  const keptRows  = rows.filter(r=>r.keep);
  const totalAmt  = keptRows.reduce((s,r)=>s+Math.abs(parseFloat(r.amount)||0),0);

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* ── Page header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:800}}>Importar Lançamentos</h2>
          <p style={{fontSize:13,color:C.muted,marginTop:3}}>Importe extratos bancários ou faturas de cartão</p>
        </div>
        {(rows.length>0||pdfRows.length>0) && (
          <Btn variant="ghost" onClick={reset}>↺ Nova importação</Btn>
        )}
      </div>

      {/* ── SOURCE TYPE tabs ── */}
      {!done && (
        <div style={{display:"flex",gap:4,background:"#eef1f8",borderRadius:10,padding:3,width:"fit-content"}}>
          {[["sheet","📊 Planilha / CSV"],["pdf","📄 Fatura PDF (IA)"]].map(([v,l])=>(
            <button key={v} onClick={()=>{setTab(v);reset();}}
              style={{padding:"8px 20px",borderRadius:8,border:"none",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .15s",
                      background:tab===v?C.primary:"transparent",color:tab===v?"#fff":C.muted}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ══════ DONE screen ══════ */}
      {done && (
        <Card style={{textAlign:"center",padding:48}}>
          <div style={{fontSize:52,marginBottom:14}}>{done.imported>0?"✅":"⚠️"}</div>
          <h3 style={{fontSize:20,fontWeight:800,marginBottom:8}}>
            {done.imported>0?"Importação concluída!":"Nenhum dado importado"}
          </h3>
          <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:16,flexWrap:"wrap"}}>
            <div style={{background:C.greenLight,borderRadius:10,padding:"12px 28px"}}>
              <div style={{fontSize:28,fontWeight:800,color:C.green}}>{done.imported}</div>
              <div style={{fontSize:12,color:C.green,fontWeight:600}}>Importadas</div>
            </div>
            {done.duplicates>0&&<div style={{background:C.yellowLight,borderRadius:10,padding:"12px 28px"}}>
              <div style={{fontSize:28,fontWeight:800,color:C.yellow}}>{done.duplicates}</div>
              <div style={{fontSize:12,color:C.yellow,fontWeight:600}}>Duplicatas ignoradas</div>
            </div>}
            {done.skipped>0&&<div style={{background:"#f1f5f9",borderRadius:10,padding:"12px 28px"}}>
              <div style={{fontSize:28,fontWeight:800,color:C.muted}}>{done.skipped}</div>
              <div style={{fontSize:12,color:C.muted,fontWeight:600}}>Removidas manualmente</div>
            </div>}
          </div>
          <div style={{marginTop:24,display:"flex",gap:10,justifyContent:"center"}}>
            <Btn variant="primary" onClick={reset}>Importar outro arquivo</Btn>
          </div>
        </Card>
      )}

      {/* ══════ SHEET TAB ══════ */}
      {!done && tab==="sheet" && (
        <>
          {/* Type + drop in same card */}
          <Card>
            {/* Tipo */}
            <div style={{display:"flex",gap:0,background:"#eef1f8",borderRadius:8,padding:3,width:"fit-content",marginBottom:16}}>
              {[["expense","💳 Despesas"],["income","💰 Receitas"]].map(([v,l])=>(
                <button key={v} onClick={()=>setItype(v)}
                  style={{padding:"6px 18px",borderRadius:6,border:"none",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer",
                          background:itype===v?(v==="expense"?C.red:C.green):"transparent",color:itype===v?"#fff":C.muted}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e=>{e.preventDefault();setDrag(true);}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);readSheet(e.dataTransfer.files[0]);}}
              style={{border:`2px dashed ${drag?C.primary:C.border}`,borderRadius:12,padding:"32px 20px",
                      textAlign:"center",background:drag?C.primaryLight:"#fafbfd",transition:"all .2s",
                      position:"relative",cursor:"pointer"}}>
              <input type="file" accept=".xlsx,.xls,.csv"
                onChange={e=>readSheet(e.target.files[0])}
                style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}} />
              {filename ? (
                <div>
                  <div style={{fontSize:28,marginBottom:8}}>📊</div>
                  <div style={{fontWeight:700,fontSize:15,color:C.primary,marginBottom:4}}>{filename}</div>
                  <div style={{fontSize:13,color:C.muted}}>{rawRows.length} linhas encontradas</div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:36,marginBottom:10,opacity:.5}}>📊</div>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Arraste aqui ou clique para selecionar</div>
                  <div style={{fontSize:12,color:C.muted}}>.xlsx · .xls · .csv — até 10 MB</div>
                </div>
              )}
            </div>

            {error && <div style={{marginTop:12,background:C.redLight,borderRadius:8,padding:"10px 14px",fontSize:13,color:C.red,fontWeight:600}}>⚠️ {error}</div>}
          </Card>

          {/* Column mapping — only shown after file loaded */}
          {headers.length > 0 && (
            <Card>
              <div style={{fontWeight:700,fontSize:15,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                <span>Mapeamento de colunas</span>
                <span style={{fontSize:12,color:C.muted,fontWeight:400}}>— {filename}</span>
              </div>

              {/* Preview table */}
              <div style={{overflowX:"auto",border:`1px solid ${C.border}`,borderRadius:8,marginBottom:16,maxHeight:160}}>
                <table style={{borderCollapse:"collapse",fontSize:12,whiteSpace:"nowrap",width:"100%"}}>
                  <thead>
                    <tr>
                      {headers.map((h,i)=>(
                        <th key={i} style={{padding:"7px 12px",background:"#f0f4f8",borderBottom:`1px solid ${C.border}`,
                          fontWeight:700,color:C.muted,textAlign:"left",position:"sticky",top:0}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0,4).map((row,i)=>(
                      <tr key={i} style={{background:i%2===0?"#fff":"#f9fafb"}}>
                        {headers.map((_,j)=>(
                          <td key={j} style={{padding:"5px 12px",borderBottom:`1px solid ${C.border}`,maxWidth:160,
                            overflow:"hidden",textOverflow:"ellipsis",color:C.text,fontSize:12}}>
                            {String(row[j]??"")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selects — linha 1: colunas obrigatórias + opcionais */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:12}}>
                {[
                  ["📅 Vencimento *",   mapDate,     setMapDate    ],
                  ["📝 Descrição *",    mapDesc,     setMapDesc    ],
                  ["💰 Valor *",        mapVal,      setMapVal     ],
                  ["🏷️ Categoria",     mapCat,      setMapCat     ],
                  ["🏦 Conta (coluna)", mapAccCol,   setMapAccCol  ],
                  ["🏢 Centro de Custo",mapCCCol,    setMapCCCol   ],
                  ["🔢 Parcelas",       mapParcelas, setMapParcelas],
                ].map(([label,val,setter])=>(
                  <div key={label} style={{display:"flex",flexDirection:"column",gap:5}}>
                    <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</label>
                    <select value={val} onChange={e=>setter(parseInt(e.target.value))}
                      style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,
                              fontFamily:"inherit",fontSize:13,padding:"8px 10px",outline:"none",cursor:"pointer"}}>
                      <option value={-1}>— ignorar —</option>
                      {headers.map((h,i)=><option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Conta padrão (quando não mapeada)</label>
                  <select value={mapAcc} onChange={e=>setMapAcc(e.target.value)}
                    style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,
                            fontFamily:"inherit",fontSize:13,padding:"8px 10px",outline:"none",cursor:"pointer"}}>
                    {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Ignorar linhas que contenham (separe por vírgula)</label>
                  <input value={skipKw} onChange={e=>setSkipKw(e.target.value)}
                    placeholder="SALDO,TOTAL,PAGAMENTO,ANTERIOR"
                    style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,
                            fontFamily:"inherit",fontSize:13,padding:"8px 12px",outline:"none"}} />
                </div>
              </div>

              <button onClick={handleApply}
                style={{background:`linear-gradient(135deg,${C.primary},#1a6bc4)`,color:"#fff",border:"none",borderRadius:9,
                        padding:"10px 24px",fontFamily:"inherit",fontWeight:700,fontSize:14,cursor:"pointer",
                        boxShadow:"0 2px 8px rgba(13,79,160,.25)"}}>
                ↻ Aplicar mapeamento
              </button>
            </Card>
          )}

          {/* Preview / edit table */}
          {rows.length > 0 && (
            <Card style={{padding:0,overflow:"hidden"}}>
              {/* ── Table toolbar ── */}
              <div style={{borderBottom:`1px solid ${C.border}`,background:"#fafbfd"}}>

                {/* Row 1: summary + select buttons + import */}
                <div style={{padding:"10px 16px",display:"flex",alignItems:"center",
                             justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontWeight:700,fontSize:14}}>
                      {keptRows.length} de {rows.length} linhas selecionadas
                    </span>
                    {keptRows.reduce((s,r)=>s+(r.parcelas||1),0)!==keptRows.length&&(
                      <span style={{fontSize:12,color:C.primary,fontWeight:700,background:C.primaryLight,borderRadius:6,padding:"2px 8px"}}>
                        📅 {keptRows.reduce((s,r)=>s+(r.parcelas||1),0)} lançamentos gerados
                      </span>
                    )}
                    <span style={{fontSize:13,color:C.red,fontWeight:700}}>Total: {fmt(totalAmt)}</span>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <button onClick={()=>toggleAll(true)}
                      style={{background:C.greenLight,color:C.green,border:"none",borderRadius:7,
                              padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      ✓ Marcar todos
                    </button>
                    <button onClick={()=>toggleAll(false)}
                      style={{background:"#f1f5f9",color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,
                              padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      ✕ Desmarcar todos
                    </button>
                    <button onClick={confirmImport}
                      style={{background:`linear-gradient(135deg,${C.primary},#1a6bc4)`,color:"#fff",border:"none",
                              borderRadius:9,padding:"8px 20px",fontFamily:"inherit",fontWeight:700,fontSize:13,
                              cursor:"pointer",boxShadow:"0 2px 8px rgba(13,79,160,.25)"}}>
                      ✓ Importar {keptRows.length} lançamento{keptRows.length!==1?"s":""}
                    </button>
                  </div>
                </div>

                {/* Row 2: Bulk edit bar */}
                <div style={{padding:"8px 16px 10px",borderTop:`1px dashed ${C.border}`,
                             display:"flex",alignItems:"flex-end",flexWrap:"wrap",gap:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",
                                letterSpacing:"0.07em",alignSelf:"center",flexShrink:0}}>
                    ✏️ Editar selecionadas:
                  </span>

                  {/* Date */}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <label style={{fontSize:9,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em"}}>Data</label>
                    <input type="date" value={bulkImport.date}
                      onChange={e=>setBulkImport(b=>({...b,date:e.target.value}))}
                      style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:7,color:C.text,
                              fontFamily:"inherit",fontSize:12,padding:"5px 8px",outline:"none",width:132}} />
                  </div>

                  {/* Type */}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <label style={{fontSize:9,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tipo</label>
                    <select value={bulkImport.type} onChange={e=>setBulkImport(b=>({...b,type:e.target.value}))}
                      style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:7,color:C.text,
                              fontFamily:"inherit",fontSize:12,padding:"5px 8px",outline:"none",cursor:"pointer",width:100}}>
                      <option value="">— manter —</option>
                      <option value="expense">↓ Despesa</option>
                      <option value="income">↑ Receita</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <label style={{fontSize:9,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em"}}>Categoria</label>
                    <select value={bulkImport.category} onChange={e=>setBulkImport(b=>({...b,category:e.target.value}))}
                      style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:7,color:C.text,
                              fontFamily:"inherit",fontSize:12,padding:"5px 8px",outline:"none",cursor:"pointer",width:130}}>
                      <option value="">— manter —</option>
                      <optgroup label="Despesas">{getCatsExpense().map(c=><option key={c} value={c}>{c}</option>)}</optgroup>
                      <optgroup label="Receitas">{getCatsIncome().map(c=><option key={c} value={c}>{c}</option>)}</optgroup>
                    </select>
                  </div>

                  {/* Account */}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <label style={{fontSize:9,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em"}}>Conta</label>
                    <select value={bulkImport.accountId} onChange={e=>setBulkImport(b=>({...b,accountId:e.target.value}))}
                      style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:7,color:C.text,
                              fontFamily:"inherit",fontSize:12,padding:"5px 8px",outline:"none",cursor:"pointer",width:130}}>
                      <option value="">— manter —</option>
                      {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  {/* Cost center */}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <label style={{fontSize:9,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em"}}>Centro de Custo</label>
                    <select value={bulkImport.costCenterId} onChange={e=>setBulkImport(b=>({...b,costCenterId:e.target.value}))}
                      style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:7,color:C.text,
                              fontFamily:"inherit",fontSize:12,padding:"5px 8px",outline:"none",cursor:"pointer",width:130}}>
                      <option value="">— manter —</option>
                      <option value="__clear__">✕ Remover CC</option>
                      {(costCenters||[]).filter(cc=>cc.active).map(cc=>(
                        <option key={cc.id} value={cc.id}>{cc.icon} {cc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <label style={{fontSize:9,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em"}}>Status</label>
                    <select value={bulkImport.status} onChange={e=>setBulkImport(b=>({...b,status:e.target.value}))}
                      style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:7,color:C.text,
                              fontFamily:"inherit",fontSize:12,padding:"5px 8px",outline:"none",cursor:"pointer",width:100}}>
                      <option value="">— manter —</option>
                      <option value="pago">Pago</option>
                      <option value="pendente">Pendente</option>
                      <option value="vencido">Vencido</option>
                    </select>
                  </div>

                  {/* Apply button */}
                  <button onClick={applyBulkImport}
                    disabled={!bulkImport.date&&!bulkImport.type&&!bulkImport.category&&!bulkImport.accountId&&!bulkImport.costCenterId&&!bulkImport.status}
                    style={{background:(!bulkImport.date&&!bulkImport.type&&!bulkImport.category&&!bulkImport.accountId&&!bulkImport.costCenterId&&!bulkImport.status)
                              ? "#e9ecf3" : `linear-gradient(135deg,${C.orange},#e05510)`,
                            color:(!bulkImport.date&&!bulkImport.type&&!bulkImport.category&&!bulkImport.accountId&&!bulkImport.costCenterId&&!bulkImport.status)
                              ? C.dim : "#fff",
                            border:"none",borderRadius:9,padding:"8px 16px",fontFamily:"inherit",fontWeight:700,
                            fontSize:12,cursor:"pointer",alignSelf:"flex-end",whiteSpace:"nowrap",
                            boxShadow:(!bulkImport.date&&!bulkImport.type&&!bulkImport.category&&!bulkImport.accountId&&!bulkImport.costCenterId&&!bulkImport.status)
                              ? "none" : "0 2px 8px rgba(242,101,34,.3)",
                            transition:"all .15s"}}>
                    ↓ Aplicar em {keptRows.length}
                  </button>
                </div>
              </div>

              {/* Scrollable table */}
              <div style={{overflowX:"auto",maxHeight:460,overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead style={{position:"sticky",top:0,zIndex:2}}>
                    <tr style={{background:"#f0f4f8"}}>
                      <th style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                        <input type="checkbox"
                          checked={rows.length>0&&rows.every(r=>r.keep)}
                          onChange={e=>toggleAll(e.target.checked)} />
                      </th>
                      {["Data","Descrição","Valor","Tipo","Categoria","Conta","C.Custo","Parcelas","Status",""].map(h=>(
                        <th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:11,fontWeight:700,
                          color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row,i)=>(
                      <tr key={row.id}
                        style={{borderTop:`1px solid ${C.border}`,
                          background:!row.keep?"#f8f9fb":i%2===0?"#fff":"#fafbfd",
                          opacity:row.keep?1:.45,transition:"opacity .1s"}}>
                        <td style={{padding:"8px 14px"}}>
                          <input type="checkbox" checked={row.keep}
                            onChange={e=>e.target.checked?restoreRow(row.id):removeRow(row.id)} />
                        </td>
                        {/* Date */}
                        <td style={{padding:"8px 8px",whiteSpace:"nowrap"}}>
                          <input type="date" value={row.date}
                            onChange={e=>updateRow(row.id,"date",e.target.value)}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.text,fontFamily:"inherit",fontSize:12,padding:"3px 6px",outline:"none",width:120}} />
                        </td>
                        {/* Desc */}
                        <td style={{padding:"8px 8px",minWidth:160,maxWidth:240}}>
                          <input value={row.desc}
                            onChange={e=>updateRow(row.id,"desc",e.target.value)}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.text,fontFamily:"inherit",fontSize:13,padding:"3px 8px",outline:"none",width:"100%"}} />
                        </td>
                        {/* Amount */}
                        <td style={{padding:"8px 8px",whiteSpace:"nowrap"}}>
                          <input type="number" value={row.amount} min="0" step="0.01"
                            onChange={e=>updateRow(row.id,"amount",e.target.value)}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:row.type==="income"?C.green:C.red,fontFamily:"inherit",fontSize:13,
                                    fontWeight:700,padding:"3px 8px",outline:"none",width:100,textAlign:"right"}} />
                        </td>
                        {/* Type */}
                        <td style={{padding:"8px 6px"}}>
                          <select value={row.type} onChange={e=>updateRow(row.id,"type",e.target.value)}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:row.type==="income"?C.green:C.red,fontFamily:"inherit",fontSize:12,
                                    fontWeight:700,padding:"3px 6px",outline:"none",cursor:"pointer"}}>
                            <option value="expense">↓ Despesa</option>
                            <option value="income">↑ Receita</option>
                          </select>
                        </td>
                        {/* Category */}
                        <td style={{padding:"8px 6px"}}>
                          <select value={row.category} onChange={e=>updateRow(row.id,"category",e.target.value)}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.text,fontFamily:"inherit",fontSize:12,padding:"3px 6px",outline:"none",cursor:"pointer"}}>
                            {[...CATS_EXPENSE,...CATS_INCOME].filter((v,i,a)=>a.indexOf(v)===i).map(c=>(
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        {/* Conta bancária por linha */}
                        <td style={{padding:"8px 6px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            {row.accountName && !row.accountMatched && (
                              <span title={`"${row.accountName}" não encontrada — usando conta padrão`}
                                style={{fontSize:13,cursor:"help"}}>⚠️</span>
                            )}
                            <select value={row.accountId||mapAcc} onChange={e=>updateRow(row.id,"accountId",e.target.value)}
                              style={{background:"transparent",border:`1px solid ${row.accountName&&!row.accountMatched?C.yellow:C.border}`,
                                      borderRadius:6,color:C.muted,fontFamily:"inherit",fontSize:12,
                                      padding:"3px 6px",outline:"none",cursor:"pointer",maxWidth:110}}>
                              {accounts.map(a=><option key={a.id} value={a.id}>{a.name.length>14?a.name.slice(0,13)+"…":a.name}</option>)}
                            </select>
                          </div>
                        </td>
                        {/* Cost center */}
                        <td style={{padding:"8px 6px"}}>
                          <select value={row.costCenterId||""} onChange={e=>updateRow(row.id,"costCenterId",e.target.value)}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.muted,fontFamily:"inherit",fontSize:12,padding:"3px 6px",outline:"none",cursor:"pointer"}}>
                            <option value="">—</option>
                            {(costCenters||[]).filter(cc=>cc.active).map(cc=>(
                              <option key={cc.id} value={cc.id}>{cc.icon} {cc.name}</option>
                            ))}
                          </select>
                        </td>
                        {/* Parcelas */}
                        <td style={{padding:"8px 6px",whiteSpace:"nowrap"}}>
                          <input type="number" value={row.parcelas||1} min="1" max="60"
                            onChange={e=>updateRow(row.id,"parcelas",Math.max(1,parseInt(e.target.value)||1))}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:(row.parcelas||1)>1?C.primary:C.muted,fontFamily:"inherit",fontSize:12,
                                    fontWeight:(row.parcelas||1)>1?700:400,padding:"3px 6px",outline:"none",width:56,textAlign:"center"}} />
                        </td>
                        {/* Status */}
                        <td style={{padding:"8px 6px"}}>
                          <select value={row.status} onChange={e=>updateRow(row.id,"status",e.target.value)}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.text,fontFamily:"inherit",fontSize:12,padding:"3px 6px",outline:"none",cursor:"pointer"}}>
                            <option value="pago">Pago</option>
                            <option value="pendente">Pendente</option>
                            <option value="vencido">Vencido</option>
                          </select>
                        </td>
                        {/* Remove */}
                        <td style={{padding:"8px 8px"}}>
                          <button onClick={()=>row.keep?removeRow(row.id):restoreRow(row.id)}
                            title={row.keep?"Remover linha":"Restaurar linha"}
                            style={{background:"transparent",border:`1px solid ${row.keep?C.border:C.green}`,
                                    borderRadius:6,width:26,height:26,cursor:"pointer",color:row.keep?C.dim:C.green,
                                    fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>
                            {row.keep?"×":"↺"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {rows.length === 0 && rawRows.length > 0 && !error && (
            <div style={{background:C.yellowLight,borderRadius:10,padding:"12px 16px",fontSize:13,color:C.yellow,fontWeight:600}}>
              ⚠️ Nenhuma linha válida encontrada. Verifique o mapeamento de colunas e clique em "Aplicar mapeamento".
            </div>
          )}
        </>
      )}

      {/* ══════ PDF TAB ══════ */}
      {!done && tab==="pdf" && (
        <>
          {/* Tipo */}
          {pdfStatus==="idle"&&(
            <Card>
              <div style={{display:"flex",gap:0,background:"#eef1f8",borderRadius:8,padding:3,width:"fit-content",marginBottom:16}}>
                {[["expense","💳 Despesas"],["income","💰 Receitas"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setItype(v)}
                    style={{padding:"6px 18px",borderRadius:6,border:"none",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer",
                            background:itype===v?(v==="expense"?C.red:C.green):"transparent",color:itype===v?"#fff":C.muted}}>
                    {l}
                  </button>
                ))}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Conta bancária</label>
                <select value={mapAcc} onChange={e=>setMapAcc(e.target.value)}
                  style={{background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,
                          fontFamily:"inherit",fontSize:13,padding:"8px 12px",outline:"none",cursor:"pointer",maxWidth:300}}>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div
                onDragOver={e=>{e.preventDefault();setDrag(true);}}
                onDragLeave={()=>setDrag(false)}
                onDrop={e=>{e.preventDefault();setDrag(false);analyzePdf(e.dataTransfer.files[0]);}}
                style={{border:`2px dashed ${drag?C.primary:C.border}`,borderRadius:12,padding:"40px 20px",
                        textAlign:"center",background:drag?C.primaryLight:"#fafbfd",transition:"all .2s",
                        position:"relative",cursor:"pointer"}}>
                <input type="file" accept=".pdf,application/pdf"
                  onChange={e=>analyzePdf(e.target.files[0])}
                  style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}} />
                <div style={{fontSize:36,marginBottom:10,opacity:.5}}>📄</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Arraste a fatura PDF aqui</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:14}}>O Claude IA lê e extrai as transações automaticamente</div>
                <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                  {["Nubank","Itaú","Bradesco","Santander","Inter","C6","BTG","Sicredi"].map(b=>(
                    <span key={b} style={{fontSize:11,background:C.primaryLight,color:C.primary,borderRadius:5,padding:"2px 9px",fontWeight:600}}>{b}</span>
                  ))}
                </div>
              </div>
              {pdfErr&&<div style={{marginTop:12,background:C.redLight,borderRadius:8,padding:"10px 14px",fontSize:13,color:C.red}}>⚠️ {pdfErr}</div>}
            </Card>
          )}

          {pdfStatus==="loading"&&(
            <Card style={{textAlign:"center",padding:48}}>
              <div style={{fontSize:48,marginBottom:16,display:"inline-block",animation:"spin 1.5s linear infinite"}}>🤖</div>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              <h3 style={{fontWeight:800,marginBottom:8}}>Analisando a fatura...</h3>
              <p style={{color:C.muted,fontSize:13}}>{filename}</p>
            </Card>
          )}

          {pdfStatus==="review"&&(
            <Card style={{padding:0,overflow:"hidden"}}>
              {/* Info bar */}
              <div style={{padding:"12px 16px",background:C.primaryLight,borderBottom:`1px solid ${C.border}`,
                display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{fontSize:22}}>🤖</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:C.primary}}>{pdfInfo?.bank||filename}</div>
                  <div style={{fontSize:12,color:C.muted}}>{pdfInfo?.period} · {pdfRows.length} transações extraídas</div>
                </div>
                {pdfInfo?.total>0&&<div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase"}}>Total</div>
                  <div style={{fontSize:16,fontWeight:800,color:C.red}}>{fmt(pdfInfo.total)}</div>
                </div>}
                <button onClick={confirmPdfImport}
                  style={{background:`linear-gradient(135deg,${C.primary},#1a6bc4)`,color:"#fff",border:"none",borderRadius:9,
                          padding:"9px 22px",fontFamily:"inherit",fontWeight:700,fontSize:14,cursor:"pointer",
                          boxShadow:"0 2px 8px rgba(13,79,160,.25)"}}>
                  ✓ Importar {pdfRows.filter(r=>r.keep).length} transações
                </button>
              </div>

              <div style={{overflowX:"auto",maxHeight:460,overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead style={{position:"sticky",top:0,zIndex:2}}>
                    <tr style={{background:"#f0f4f8"}}>
                      <th style={{padding:"9px 14px"}}>
                        <input type="checkbox"
                          checked={pdfRows.every(r=>r.keep)}
                          onChange={e=>setPdfRows(rs=>rs.map(r=>({...r,keep:e.target.checked})))} />
                      </th>
                      {["Data","Descrição","Valor","Categoria","Centro de Custo",""].map(h=>(
                        <th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:11,fontWeight:700,
                          color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pdfRows.map((row,i)=>(
                      <tr key={row.id} style={{borderTop:`1px solid ${C.border}`,
                        background:!row.keep?"#f8f9fb":i%2===0?"#fff":"#fafbfd",opacity:row.keep?1:.4}}>
                        <td style={{padding:"8px 14px"}}>
                          <input type="checkbox" checked={row.keep}
                            onChange={e=>setPdfRows(rs=>rs.map(r=>r.id===row.id?{...r,keep:e.target.checked}:r))} />
                        </td>
                        <td style={{padding:"8px 8px",whiteSpace:"nowrap"}}>
                          <input type="date" value={row.date}
                            onChange={e=>setPdfRows(rs=>rs.map(r=>r.id===row.id?{...r,date:e.target.value}:r))}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.text,fontFamily:"inherit",fontSize:12,padding:"3px 6px",outline:"none",width:120}} />
                        </td>
                        <td style={{padding:"8px 8px",minWidth:180}}>
                          <input value={row.desc}
                            onChange={e=>setPdfRows(rs=>rs.map(r=>r.id===row.id?{...r,desc:e.target.value}:r))}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.text,fontFamily:"inherit",fontSize:13,padding:"3px 8px",outline:"none",width:"100%"}} />
                        </td>
                        <td style={{padding:"8px 8px",whiteSpace:"nowrap"}}>
                          <input type="number" value={row.amount} min="0" step="0.01"
                            onChange={e=>setPdfRows(rs=>rs.map(r=>r.id===row.id?{...r,amount:e.target.value}:r))}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.red,fontFamily:"inherit",fontSize:13,fontWeight:700,
                                    padding:"3px 8px",outline:"none",width:100,textAlign:"right"}} />
                        </td>
                        <td style={{padding:"8px 6px"}}>
                          <select value={row.category}
                            onChange={e=>setPdfRows(rs=>rs.map(r=>r.id===row.id?{...r,category:e.target.value}:r))}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.text,fontFamily:"inherit",fontSize:12,padding:"3px 6px",outline:"none",cursor:"pointer"}}>
                            {[...CATS_EXPENSE,...CATS_INCOME].filter((v,i,a)=>a.indexOf(v)===i).map(c=>(
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{padding:"8px 6px"}}>
                          <select value={row.costCenterId||""}
                            onChange={e=>setPdfRows(rs=>rs.map(r=>r.id===row.id?{...r,costCenterId:e.target.value}:r))}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                                    color:C.muted,fontFamily:"inherit",fontSize:12,padding:"3px 6px",outline:"none",cursor:"pointer"}}>
                            <option value="">—</option>
                            {(costCenters||[]).filter(cc=>cc.active).map(cc=>(
                              <option key={cc.id} value={cc.id}>{cc.icon} {cc.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{padding:"8px 8px"}}>
                          <button
                            onClick={()=>setPdfRows(rs=>rs.map(r=>r.id===row.id?{...r,keep:!r.keep}:r))}
                            style={{background:"transparent",border:`1px solid ${row.keep?C.border:C.green}`,
                                    borderRadius:6,width:26,height:26,cursor:"pointer",
                                    color:row.keep?C.dim:C.green,fontSize:14,
                                    display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>
                            {row.keep?"×":"↺"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
//  RECURRENCE HELPERS
const RECURRENCE_LABELS = {
  weekly:"Semanal", biweekly:"Quinzenal", monthly:"Mensal",
  bimonthly:"Bimestral", quarterly:"Trimestral", semiannual:"Semestral", yearly:"Anual"
};

const RecurrenceForm = ({ initial, accounts, contacts, onSave, onClose }) => {
  const blank = { id:uid(), name:"", type:"expense", amount:"", category:getCatsExpense()[0],
    accountId:accounts[0]?.id||"", contactId:"", frequency:"monthly",
    startDate:tod(), installments:"12", mode:"recurring", notes:"" };
  const [form, setForm] = useState({ ...blank, ...(initial||{}) });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const cats = form.type==="income" ? getCatsIncome() : getCatsExpense();

  const preview = useMemo(() => {
    const n = Math.min(parseInt(form.installments)||1, 120);
    const start = new Date(form.startDate+"T12:00:00");
    const dates = [];
    for (let i=0; i<n; i++) {
      const d = new Date(start);
      if      (form.frequency==="weekly")      d.setDate(d.getDate()+i*7);
      else if (form.frequency==="biweekly")    d.setDate(d.getDate()+i*14);
      else if (form.frequency==="monthly")     d.setMonth(d.getMonth()+i);
      else if (form.frequency==="bimonthly")   d.setMonth(d.getMonth()+i*2);
      else if (form.frequency==="quarterly")   d.setMonth(d.getMonth()+i*3);
      else if (form.frequency==="semiannual")  d.setMonth(d.getMonth()+i*6);
      else if (form.frequency==="yearly")      d.setFullYear(d.getFullYear()+i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, [form.frequency, form.startDate, form.installments]);

  const si = { background:"#f5f7fb", border:`1px solid ${C.border}`, borderRadius:8, color:C.text,
    fontFamily:"inherit", fontSize:13, padding:"8px 10px", outline:"none", width:"100%", cursor:"pointer" };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{gridColumn:"span 2",display:"flex",gap:0,background:"#f1f3f9",borderRadius:10,padding:4}}>
        {["expense","income"].map(t=>(
          <button key={t} onClick={()=>{set("type",t);set("category",t==="income"?getCatsIncome()[0]:getCatsExpense()[0]);}}
            style={{flex:1,padding:"8px 0",borderRadius:7,border:"none",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer",
                    background:form.type===t?(t==="income"?C.green:C.red):"transparent",color:form.type===t?"#fff":C.muted}}>
            {t==="income"?"↑  Receita":"↓  Despesa"}
          </button>
        ))}
      </div>
      <div style={{gridColumn:"span 2",display:"flex",flexDirection:"column",gap:5}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Nome da regra</label>
        <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: Aluguel, Netflix, Parcela do carro"
          style={{...si,cursor:"default"}} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Valor (R$)</label>
        <input type="number" min="0" step="0.01" value={form.amount} onChange={e=>set("amount",e.target.value)}
          placeholder="0,00" style={{...si,cursor:"default"}} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Categoria</label>
        <select value={form.category} onChange={e=>set("category",e.target.value)} style={si}>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Tipo de recorrência</label>
        <select value={form.mode} onChange={e=>set("mode",e.target.value)} style={si}>
          <option value="installments">Parcelado (nº fixo)</option>
          <option value="recurring">Recorrente (prazo indeterminado)</option>
        </select>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Frequência</label>
        <select value={form.frequency} onChange={e=>set("frequency",e.target.value)} style={si}>
          {Object.entries(RECURRENCE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{form.mode==="installments"?"Nº de parcelas":"Meses (999 = indeterminado)"}</label>
        <input type="number" min="1" max="999" value={form.installments} onChange={e=>set("installments",e.target.value)}
          style={{...si,cursor:"default"}} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Data da 1ª parcela</label>
        <input type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)} style={{...si,cursor:"default"}} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Conta bancária</label>
        <select value={form.accountId} onChange={e=>set("accountId",e.target.value)} style={si}>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5,gridColumn:"span 2"}}>
        <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Observações</label>
        <textarea value={form.notes} onChange={e=>set("notes",e.target.value)}
          style={{...si,minHeight:60,resize:"vertical",cursor:"default"}} />
      </div>
      {preview.length>0 && (
        <div style={{gridColumn:"span 2",background:"#f7f8fc",borderRadius:10,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>
            Prévia — {preview.length} lançamento{preview.length!==1?"s":""} · Total: {fmt((parseFloat(form.amount)||0)*preview.length)}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:80,overflow:"auto"}}>
            {preview.map((d,i)=>(
              <span key={i} style={{fontSize:11,background:C.primaryLight,color:C.primary,borderRadius:5,padding:"2px 8px",fontWeight:600}}>
                {form.mode==="installments"?`${i+1}/${preview.length} `:""}{fmtDate(d)}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{gridColumn:"span 2",display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 18px",
          fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",color:C.muted}}>Cancelar</button>
        <button onClick={()=>{
          if(!form.name||!form.amount){alert("Preencha nome e valor.");return;}
          onSave({...form,amount:parseFloat(form.amount),preview});
        }} style={{background:`linear-gradient(135deg,${C.primary},#1a6bc4)`,color:"#fff",border:"none",borderRadius:9,
          padding:"9px 20px",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer"}}>
          Gerar {preview.length} lançamento{preview.length!==1?"s":""}
        </button>
      </div>
    </div>
  );
};
//  BILLS (Contas a pagar/receber)
const Recurrences = ({ txs, accounts, contacts, onGenerate, onDeleteGroup }) => {
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);

  // Group transactions by recurrenceGroupId
  const groups = useMemo(() => {
    const g = {};
    txs.filter(t => t.recurrenceGroupId).forEach(t => {
      if (!g[t.recurrenceGroupId]) g[t.recurrenceGroupId] = { ...t, items:[] };
      g[t.recurrenceGroupId].items.push(t);
    });
    Object.values(g).forEach(gr => gr.items.sort((a,b)=>a.date.localeCompare(b.date)));
    return Object.values(g).sort((a,b)=>b.items[0]?.date.localeCompare(a.items[0]?.date)||0);
  }, [txs]);

  const handleSave = (rule) => {
    const groupId = uid();
    const generated = rule.preview.map((date, i) => ({
      id: uid(),
      recurrenceGroupId: groupId,
      recurrenceGroupName: rule.name,
      recurrenceIndex: i + 1,
      recurrenceTotal: rule.preview.length,
      recurrenceMode: rule.mode,
      recurrenceFreq: rule.frequency,
      desc: rule.mode==="installments"
        ? `${rule.name} (${i+1}/${rule.preview.length})`
        : rule.name,
      amount: rule.amount,
      type: rule.type,
      category: rule.category,
      date,
      status: date <= tod() ? "pendente" : "pendente",
      accountId: rule.accountId,
      contactId: rule.contactId || "",
      recurrence: rule.frequency,
      notes: rule.notes || "",
      source: "manual",
    }));
    onGenerate(generated);
    setShowForm(false);
    setEditRule(null);
  };

  const getGroupProgress = (items) => {
    const paid = items.filter(t=>t.status==="pago").length;
    return { paid, total:items.length, pct: items.length>0?(paid/items.length*100):0 };
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800 }}>Recorrências & Parcelamentos</h2>
          <p style={{ fontSize:13, color:C.muted, marginTop:3 }}>Gere séries de lançamentos automáticos — parcelas fixas ou despesas mensais</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={()=>setShowForm(true)}>Nova Recorrência</Btn>
      </div>

      {/* Summary mini-cards */}
      {groups.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {[
            ["Grupos ativos", groups.length, C.primary, C.primaryLight],
            ["Parcelas pendentes", txs.filter(t=>t.recurrenceGroupId&&t.status==="pendente").length, C.yellow, C.yellowLight],
            ["Total comprometido", txs.filter(t=>t.recurrenceGroupId&&t.status!=="pago"&&t.status!=="cancelado").reduce((s,t)=>s+t.amount,0), C.red, C.redLight],
          ].map(([label, val, color, bg]) => (
            <div key={label} style={{ background:bg, borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
              <div style={{ fontSize:20, fontWeight:800, color, marginTop:4 }}>{typeof val==="number"&&val>100?fmt(val):val}</div>
            </div>
          ))}
        </div>
      )}

      {groups.length === 0 && !showForm && (
        <Card style={{ textAlign:"center", padding:48 }}>
          <div style={{ fontSize:48, marginBottom:12, opacity:.4 }}>🔄</div>
          <h3 style={{ fontWeight:700, marginBottom:8 }}>Nenhuma recorrência criada ainda</h3>
          <p style={{ color:C.muted, fontSize:14, marginBottom:20 }}>Crie séries de parcelas ou despesas mensais que se repetem automaticamente.</p>
          <Btn variant="primary" icon="plus" onClick={()=>setShowForm(true)}>Criar primeira recorrência</Btn>
        </Card>
      )}

      {showForm && (
        <Card>
          <h3 style={{ fontWeight:700, marginBottom:16 }}>Nova Recorrência / Parcelamento</h3>
          <RecurrenceForm accounts={accounts} contacts={contacts} onSave={handleSave} onClose={()=>setShowForm(false)} initial={editRule} />
        </Card>
      )}

      {/* Groups list */}
      {groups.map(group => {
        const { paid, total, pct } = getGroupProgress(group.items);
        const remaining = group.items.filter(t=>t.status!=="pago"&&t.status!=="cancelado");
        const totalAmt  = group.items.reduce((s,t)=>s+t.amount,0);
        const paidAmt   = group.items.filter(t=>t.status==="pago").reduce((s,t)=>s+t.amount,0);
        const isOpen    = expandedGroup === group.recurrenceGroupId;
        const freq      = RECURRENCE_LABELS[group.recurrenceFreq] || group.recurrenceFreq || "—";
        const modeLabel = group.recurrenceMode==="installments"?"Parcelado":"Recorrente";
        const nextDue   = remaining.sort((a,b)=>a.date.localeCompare(b.date))[0];

        return (
          <Card key={group.recurrenceGroupId} style={{ padding:0, overflow:"hidden" }}>
            {/* Group header */}
            <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", background:isOpen?"#f7f8fc":C.surface }} onClick={()=>setExpandedGroup(isOpen?null:group.recurrenceGroupId)}>
              <div style={{ width:40, height:40, borderRadius:12, background:group.type==="income"?C.greenLight:C.primaryLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name="recurrence" size={18} color={group.type==="income"?C.green:C.primary} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontWeight:700, fontSize:15 }}>{group.recurrenceGroupName}</span>
                  <span style={{ fontSize:10, background:C.primaryLight, color:C.primary, borderRadius:5, padding:"1px 8px", fontWeight:700 }}>{modeLabel}</span>
                  <span style={{ fontSize:10, background:"#f1f5f9", color:C.muted, borderRadius:5, padding:"1px 8px", fontWeight:600 }}>{freq}</span>
                  <span style={{ fontSize:10, background:group.type==="income"?C.greenLight:C.redLight, color:group.type==="income"?C.green:C.red, borderRadius:5, padding:"1px 8px", fontWeight:700 }}>{group.category}</span>
                </div>
                {/* Progress bar */}
                <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1, background:C.border, borderRadius:4, height:6, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:pct===100?C.green:C.primary, borderRadius:4, transition:"width .5s" }} />
                  </div>
                  <span style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap" }}>{paid}/{total} pagas</span>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:16, fontWeight:800, color:group.type==="income"?C.green:C.text }}>{fmt(group.amount)}<span style={{ fontSize:11, color:C.muted }}>/parcela</span></div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Total: {fmt(totalAmt)}</div>
              </div>
              <div style={{ fontSize:10, color:C.muted, marginLeft:4 }}>{isOpen?"▲":"▼"}</div>
              <Btn small variant="danger" icon="trash" onClick={e=>{e.stopPropagation();if(confirm(`Remover todos os ${total} lançamentos de "${group.recurrenceGroupName}"?`)) onDeleteGroup(group.recurrenceGroupId);}} />
            </div>

            {/* Expanded rows */}
            {isOpen && (
              <div style={{ borderTop:`1px solid ${C.border}` }}>
                {nextDue && (
                  <div style={{ background:C.yellowLight, padding:"8px 20px", display:"flex", gap:8, alignItems:"center" }}>
                    <Icon name="bell" size={13} color={C.yellow} />
                    <span style={{ fontSize:12, color:C.yellow, fontWeight:600 }}>Próximo vencimento: {fmtDate(nextDue.date)} · {fmt(nextDue.amount)}</span>
                  </div>
                )}
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr style={{ background:"#f7f8fc" }}>
                    {["#","Data","Descrição","Valor","Status",""].map(h=>(
                      <th key={h} style={{ padding:"8px 14px", textAlign:"left", fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {group.items.map((t,i) => (
                      <tr key={t.id} style={{ borderTop:`1px solid ${C.border}`, opacity:t.status==="cancelado"?.5:1 }}>
                        <td style={{ padding:"8px 14px", fontSize:12, color:C.muted }}>{t.recurrenceIndex||i+1}</td>
                        <td style={{ padding:"8px 14px", fontSize:12 }}>{fmtDate(t.date)}</td>
                        <td style={{ padding:"8px 14px", fontSize:13, fontWeight:600 }}>{t.desc}</td>
                        <td style={{ padding:"8px 14px", fontSize:13, fontWeight:700, color:t.type==="income"?C.green:C.text }}>{fmt(t.amount)}</td>
                        <td style={{ padding:"8px 14px" }}><Badge status={t.status} /></td>
                        <td style={{ padding:"8px 14px" }}>
                          {t.status!=="pago" && <Btn small variant="success" onClick={()=>onGenerate([{...t,status:"pago"}],true)}>Marcar pago</Btn>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding:"10px 20px", background:"#f7f8fc", display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted }}>
                  <span>Pago: <strong style={{ color:C.green }}>{fmt(paidAmt)}</strong></span>
                  <span>Restante: <strong style={{ color:C.red }}>{fmt(totalAmt-paidAmt)}</strong></span>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
//  OPEN FINANCE / CONCILIAÇÃO
// Pluggy sandbox connector IDs for the most common Brazilian banks

const ICON_MAP = {
  expense:[
    "🍔","🍕","🍣","🥗","🛒","☕","🍷","🍺","🥩","🍰",
    "🚗","⛽","🚕","🚌","✈️","🚢","🏍️","🚲","🛵","🚆",
    "🏠","🏢","🏪","🔑","🛋️","🪴","🧹","🔧","💡","💧",
    "⚡","🌐","📡","📱","💻","🖨️","🖥️","📺","🎮","🎧",
    "💊","🏥","🩺","💉","🧴","🏋️","🧘","🚑","👓","🦷",
    "📚","🎓","✏️","📐","🎒","📖","🏫","🔬","🧪","📝",
    "👗","👠","👜","🧥","💍","👒","🕶️","🧣","🛍️","💄",
    "📋","🧾","💳","🏦","📈","📉","💹","🏧","🔐","📊",
    "🤝","📣","🎯","📦","🚚","🏭","⚙️","🔩","🛠️","📌",
    "🎵","🎨","🎭","🎪","🎬","📸","🎻","🎸","🎹","🎤",
    "🐾","🐶","🐱","🌿","🌳","🌱","🌻","🎃","❄️","☀️",
    "🏆","🎁","🎉","🎈","🎀","🪆","🧸","🃏","🎲","🀄",
  ],
  income:[
    "💰","💵","💴","💶","💷","🤑","💸","🏧","💹","📈",
    "💼","🏢","📊","📋","🤝","🏆","🥇","🎯","🚀","⭐",
    "🏡","🏠","🏗️","🏘️","🔑","🏦","📝","🧾","📜","✍️",
    "💎","👑","🌟","✨","🎓","🎁","🎀","🎉","🪙","💲",
    "🖥️","💻","📱","🎤","🎸","🛒","🛍️","🏪","🏬","📦",
    "🌐","📡","📣","🎬","📸","🌿","🌱","🌻","🍀","🦋",
  ],
};
// Todos os ícones combinados para busca livre
const ALL_ICONS = [...new Set([...ICON_MAP.expense, ...ICON_MAP.income])];
const CAT_COLORS = ["#6c63ff","#0ea882","#f26522","#e03535","#f59e0b","#3b9fd4","#0d4fa0","#ec4899","#8b5cf6","#10b981","#ef4444","#f97316"];

const CategoriesPage = ({ userCats, setUserCats }) => {
  const blank = { id:uid(), name:"", type:"expense", icon:"🎯", color:"#6c63ff" };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("expense");

  const allCats = {
    expense:[...DEFAULT_CATS_EXPENSE.map(name=>({id:"def-"+name,name,icon:"🏷️",color:"",isDefault:true})),
             ...(userCats.expense||[])],
    income: [...DEFAULT_CATS_INCOME.map(name=>({id:"def-"+name,name,icon:"🏷️",color:"",isDefault:true})),
             ...(userCats.income||[])]
  };

  const list = allCats[tab].filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));

  const save = () => {
    if(!form.name.trim()){alert("Nome é obrigatório.");return;}
    const defaultsForType = form.type==="expense" ? DEFAULT_CATS_EXPENSE : DEFAULT_CATS_INCOME;
    const customForType   = (userCats[form.type]||[]).map(c=>c.name);
    const allNamesForType = [...defaultsForType, ...customForType];
    const dup = allNamesForType.some(n=>n.toLowerCase()===form.name.trim().toLowerCase() && !editId);
    if(dup){alert(`Categoria "${form.name}" já existe em ${form.type==="expense"?"Despesas":"Receitas"}.`);return;}
    if(editId){
      setUserCats(prev=>({...prev,[form.type]:(prev[form.type]||[]).map(c=>c.id===editId?{...form}:c)}));
      setEditId(null);
    } else {
      setUserCats(prev=>({...prev,[form.type]:[...(prev[form.type]||[]),{...form,id:uid()}]}));
    }
    setForm({...blank,type:form.type});
  };

  const remove = (type,id) => {
    if(!confirm("Excluir categoria? Lançamentos existentes mantêm o nome.")) return;
    setUserCats(prev=>({...prev,[type]:(prev[type]||[]).filter(c=>c.id!==id)}));
  };

  const startEdit = (c) => {
    setForm({id:c.id,name:c.name,type:tab,icon:c.icon||"🎯",color:c.color||"#6c63ff"});
    setEditId(c.id);
  };

  const si = {background:"#f5f7fb",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"inherit",fontSize:13,padding:"9px 12px",outline:"none"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div>
        <h2 style={{fontSize:22,fontWeight:800}}>Categorias</h2>
        <p style={{fontSize:13,color:C.muted,marginTop:3}}>Crie categorias personalizadas para organizar seus lançamentos</p>
      </div>

      <div style={{display:"flex",gap:0,background:"#f1f3f9",borderRadius:10,padding:4,width:"fit-content"}}>
        {["expense","income"].map(t=>(
          <button key={t} onClick={()=>{setTab(t);setSearch("");}}
            style={{padding:"8px 24px",borderRadius:7,border:"none",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer",
                    background:tab===t?C.primary:"transparent",color:tab===t?"#fff":C.muted}}>
            {t==="expense"?"💳 Despesas":"💰 Receitas"}
          </button>
        ))}
      </div>

      <Card>
        <h3 style={{fontWeight:700,marginBottom:16}}>{editId?"✏️ Editar":"+ Nova Categoria"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:12,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Nome da categoria</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&save()}
              placeholder="Ex: Farmácia, Academia, Consultoria..."
              style={{...si,width:"100%"}} />
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5,gridColumn:"span 2"}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>
              Ícone selecionado: <span style={{fontSize:20}}>{form.icon}</span>
            </label>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
              <input
                value={form.icon}
                onChange={e=>setForm(f=>({...f,icon:e.target.value}))}
                placeholder="Cole um emoji personalizado..."
                style={{...si,width:200,fontSize:18,textAlign:"center",padding:"6px 10px"}}
                maxLength={8}
              />
              <span style={{fontSize:11,color:C.muted}}>ou escolha abaixo:</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,maxHeight:160,overflowY:"auto",
              background:"#f7f8fc",borderRadius:10,padding:"10px",border:`1px solid ${C.border}`}}>
              {(ICON_MAP[form.type]||ICON_MAP.expense).map(ic=>(
                <button key={ic} type="button" onClick={()=>setForm(f=>({...f,icon:ic}))}
                  title={ic}
                  style={{width:36,height:36,borderRadius:8,border:`2px solid ${form.icon===ic?C.primary:"transparent"}`,
                    background:form.icon===ic?C.primaryLight:"transparent",fontSize:20,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",transition:"all .1s",
                    transform:form.icon===ic?"scale(1.15)":"none"}}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Cor</label>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",maxWidth:128,paddingTop:2}}>
              {CAT_COLORS.map(c=>(
                <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                  style={{width:22,height:22,borderRadius:5,background:c,border:`2px solid ${form.color===c?"#333":"transparent"}`,cursor:"pointer",padding:0,transition:"transform .1s",transform:form.color===c?"scale(1.2)":"none"}} />
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",gap:0,background:"#f1f3f9",borderRadius:8,padding:3}}>
            {["expense","income"].map(t=>(
              <button key={t} onClick={()=>setForm(f=>({...f,type:t,icon:(ICON_MAP[t]||[])[0]||"🎯"}))}
                style={{padding:"5px 14px",borderRadius:6,border:"none",fontFamily:"inherit",fontWeight:600,fontSize:12,cursor:"pointer",
                        background:form.type===t?C.primary:"transparent",color:form.type===t?"#fff":C.muted}}>
                {t==="expense"?"Despesa":"Receita"}
              </button>
            ))}
          </div>
          {editId && (
            <button onClick={()=>{setEditId(null);setForm({...blank,type:form.type});}}
              style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 16px",fontFamily:"inherit",fontSize:12,cursor:"pointer",color:C.muted}}>
              Cancelar
            </button>
          )}
          <button onClick={save}
            style={{background:`linear-gradient(135deg,${C.primary},#1a6bc4)`,color:"#fff",border:"none",borderRadius:9,
                    padding:"9px 22px",fontFamily:"inherit",fontWeight:700,fontSize:14,cursor:"pointer",boxShadow:"0 2px 8px rgba(13,79,160,.25)"}}>
            {editId?"Salvar alterações":"+ Adicionar categoria"}
          </button>
        </div>
      </Card>

      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar categoria..."
          style={{...si,maxWidth:260}} />
        <span style={{fontSize:12,color:C.dim}}>{list.filter(c=>!c.isDefault).length} personalizadas · {list.filter(c=>c.isDefault).length} padrão</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
        {list.map(cat=>(
          <div key={cat.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
            background:cat.isDefault?"#f7f8fc":C.surface,borderRadius:10,
            border:`1px solid ${cat.isDefault?C.border:(cat.color||C.primary)+"55"}`,
            boxShadow:cat.isDefault?"none":"0 1px 6px rgba(0,0,0,.06)",
            transition:"box-shadow .15s"}}>
            <div style={{width:34,height:34,borderRadius:9,
              background:cat.isDefault?"#e9ecf3":(cat.color||C.primary)+"22",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>
              {cat.icon||"🏷️"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:cat.isDefault?400:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                color:cat.isDefault?C.muted:C.text}}>{cat.name}</div>
              {cat.isDefault && <div style={{fontSize:10,color:C.dim,letterSpacing:"0.05em"}}>PADRÃO</div>}
              {!cat.isDefault && cat.color && (
                <div style={{width:16,height:4,borderRadius:2,background:cat.color,marginTop:3}} />
              )}
            </div>
            {!cat.isDefault && (
              <div style={{display:"flex",gap:3,flexShrink:0}}>
                <button onClick={()=>startEdit(cat)}
                  style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,width:26,height:26,
                          cursor:"pointer",fontSize:12,color:C.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>✏</button>
                <button onClick={()=>remove(tab,cat.id)}
                  style={{background:"transparent",border:"1px solid rgba(224,53,53,.3)",borderRadius:6,width:26,height:26,
                          cursor:"pointer",fontSize:14,color:C.red,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            )}
          </div>
        ))}
        {list.length===0 && (
          <div style={{gridColumn:"span 3",padding:32,textAlign:"center",color:C.dim,fontSize:13}}>
            Nenhuma categoria encontrada
          </div>
        )}
      </div>
    </div>
  );
};


const CostCentersPage = ({ costCenters, setCostCenters, txs }) => {
  const blank = { id:uid(), name:"", color:"#6c63ff", icon:"💼", active:true };
  const [form,   setForm]   = useState(blank);
  const [editing, setEditing] = useState(null);
  const [view,    setView]   = useState("list"); // list | report
  const [repMonth, setRepMonth] = useState(MONTHS[MONTHS.length-1]);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = () => {
    if (!form.name.trim()) { alert("Nome é obrigatório."); return; }
    if (editing) {
      setCostCenters(cs => cs.map(c=>c.id===editing?{...form,id:editing}:c));
      setEditing(null);
    } else {
      setCostCenters(cs=>[...cs,{...form}]);
    }
    setForm(blank);
  };

  const startEdit = (cc) => { setForm({...cc}); setEditing(cc.id); };
  const remove    = (id) => { if(confirm("Remover centro de custo?")) setCostCenters(cs=>cs.filter(c=>c.id!==id)); };
  const toggle    = (id) => setCostCenters(cs=>cs.map(c=>c.id===id?{...c,active:!c.active}:c));

  // Report
  const repTxs   = txs.filter(t=>getMonth(t.date)===repMonth);
  const ccReport = costCenters.map(cc=>{
    const mine = repTxs.filter(t=>t.costCenterId===cc.id);
    const exp  = mine.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    const inc  = mine.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    return { cc, exp, inc, count:mine.length, txs:mine };
  }).filter(r=>r.count>0).sort((a,b)=>b.exp-a.exp);
  const untagged = repTxs.filter(t=>!t.costCenterId);

  const EMOJIS = ["💼","🏠","👤","🚀","🏢","🎯","💡","🔧","📊","🌟","🛒","🎓","❤️","🌍","⚡"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800 }}>Centros de Custo</h2>
          <p style={{ fontSize:13, color:C.muted, marginTop:3 }}>Classifique despesas e receitas por projeto, área ou finalidade</p>
        </div>
        <div style={{ display:"flex", gap:4, background:"#f1f3f9", borderRadius:8, padding:3 }}>
          {[["list","Centros"],["report","Relatório"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:"7px 16px", borderRadius:6, border:"none", fontFamily:"inherit", fontWeight:700, fontSize:12, cursor:"pointer", background:view===v?C.primary:"transparent", color:view===v?"#fff":C.muted }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {view==="list" && (
        <>
          {/* Form */}
          <Card>
            <h3 style={{ fontWeight:700, marginBottom:14 }}>{editing?"Editar":"Novo"} Centro de Custo</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:12, alignItems:"end" }}>
              <div className="field" style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Nome</label>
                <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: Projeto Alpha, Casa, Empresa..."
                  style={{ background:"#f7f8fc", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontFamily:"inherit", fontSize:14, padding:"9px 12px", outline:"none", width:"100%" }} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Ícone</label>
                <select value={form.icon} onChange={e=>set("icon",e.target.value)}
                  style={{ background:"#f7f8fc", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontFamily:"inherit", fontSize:16, padding:"8px 10px", outline:"none", cursor:"pointer" }}>
                  {EMOJIS.map(e=><option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Cor</label>
                <input type="color" value={form.color} onChange={e=>set("color",e.target.value)}
                  style={{ background:"#f7f8fc", border:`1px solid ${C.border}`, borderRadius:8, padding:4, height:40, width:60, cursor:"pointer" }} />
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {editing && <button onClick={()=>{setEditing(null);setForm(blank);}} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 14px", cursor:"pointer", fontFamily:"inherit", fontSize:12, color:C.muted }}>Cancelar</button>}
                <button onClick={save} style={{ background:C.primary, color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13 }}>
                  {editing?"Atualizar":"+ Adicionar"}
                </button>
              </div>
            </div>
          </Card>

          {/* List */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {costCenters.map(cc=>{
              const myTxs  = txs.filter(t=>t.costCenterId===cc.id);
              const myExp  = myTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
              const myInc  = myTxs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
              return (
                <Card key={cc.id} style={{ borderLeft:`4px solid ${cc.color}`, opacity:cc.active?1:.55 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:cc.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{cc.icon}</div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>{cc.name}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{myTxs.length} lançamentos</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <button title={cc.active?"Desativar":"Ativar"} onClick={()=>toggle(cc.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>{cc.active?"✓":"○"}</button>
                      <button onClick={()=>startEdit(cc)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:12, color:C.muted }}>✏</button>
                      <button onClick={()=>remove(cc.id)} style={{ background:"transparent", border:`1px solid rgba(239,68,68,.3)`, borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:12, color:C.red }}>✕</button>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div style={{ background:C.redLight, borderRadius:8, padding:"7px 10px" }}>
                      <div style={{ fontSize:10, fontWeight:600, color:C.red, textTransform:"uppercase" }}>Despesas</div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.red }}>{fmt(myExp)}</div>
                    </div>
                    <div style={{ background:C.greenLight, borderRadius:8, padding:"7px 10px" }}>
                      <div style={{ fontSize:10, fontWeight:600, color:C.green, textTransform:"uppercase" }}>Receitas</div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.green }}>{fmt(myInc)}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {view==="report" && (
        <>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <label style={{ fontSize:12, fontWeight:600, color:C.muted }}>Mês:</label>
            <select value={repMonth} onChange={e=>setRepMonth(e.target.value)}
              style={{ background:"#f7f8fc", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontFamily:"inherit", fontSize:13, padding:"7px 12px", outline:"none" }}>
              {MONTHS.map(m=><option key={m} value={m}>{fmtMonth(m+"-01")}</option>)}
            </select>
          </div>

          {ccReport.length===0 && untagged.length===0 && (
            <Card style={{ textAlign:"center", padding:40 }}>
              <div style={{ fontSize:40, marginBottom:10, opacity:.4 }}>📊</div>
              <p style={{ color:C.muted }}>Nenhum lançamento com centro de custo neste mês.</p>
            </Card>
          )}

          {ccReport.map(({cc,exp,inc,count,txs:mTxs})=>(
            <Card key={cc.id} style={{ padding:0, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", background:`${cc.color}11`, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:cc.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{cc.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:15 }}>{cc.name}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{count} lançamento{count!==1?"s":""}</div>
                </div>
                <div style={{ display:"flex", gap:16 }}>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:C.red, fontWeight:600, textTransform:"uppercase" }}>Despesas</div><div style={{ fontSize:16, fontWeight:800, color:C.red }}>{fmt(exp)}</div></div>
                  {inc>0&&<div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:C.green, fontWeight:600, textTransform:"uppercase" }}>Receitas</div><div style={{ fontSize:16, fontWeight:800, color:C.green }}>{fmt(inc)}</div></div>}
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:"uppercase" }}>Resultado</div><div style={{ fontSize:16, fontWeight:800, color:inc-exp>=0?C.green:C.red }}>{fmt(inc-exp)}</div></div>
                </div>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#f7f8fc" }}>
                  {["Data","Descrição","Valor","Status","Categoria"].map(h=><th key={h} style={{ padding:"8px 14px", textAlign:"left", fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {mTxs.sort((a,b)=>a.date.localeCompare(b.date)).map(t=>(
                    <tr key={t.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"8px 14px", fontSize:12, color:C.muted }}>{fmtDate(t.date)}</td>
                      <td style={{ padding:"8px 14px", fontSize:13, fontWeight:600 }}>{t.desc}</td>
                      <td style={{ padding:"8px 14px", fontSize:13, fontWeight:700, color:t.type==="income"?C.green:C.red }}>{t.type==="income"?"+":"-"}{fmt(t.amount)}</td>
                      <td style={{ padding:"8px 14px" }}><Badge status={t.status} /></td>
                      <td style={{ padding:"8px 14px" }}><span style={{ fontSize:11, background:C.primaryLight, color:C.primary, borderRadius:5, padding:"2px 8px", fontWeight:600 }}>{t.category}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}

          {untagged.length>0&&(
            <Card style={{ padding:"12px 18px", background:"#f7f8fc" }}>
              <div style={{ fontSize:13, color:C.muted, fontWeight:600 }}>⚠️ {untagged.length} lançamento{untagged.length!==1?"s":""} sem centro de custo neste mês — total: {fmt(untagged.reduce((s,t)=>t.type==="expense"?s+t.amount:s,0))}</div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
//  ADMIN PAGE — acessível apenas para claracg008@gmail.com
const TIPO_LABEL = { dono:"Dono", usuario:"Usuário" };
const AdminPage = ({ currentUserId }) => {
  const [company,    setCompany]    = useState(null);
  const [nomeEdit,   setNomeEdit]   = useState("");
  const [savingName, setSavingName] = useState(false);
  const [users,      setUsers]      = useState([]);
  const [modal,      setModal]      = useState(null); // null | "new" | {user}
  const [form,       setForm]       = useState({});
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast2]     = useState(null);

  const showMsg = (msg, ok=true) => { setToast2({msg,ok}); setTimeout(()=>setToast2(null),3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [co, us] = await Promise.all([api.getCompany(), api.adminListUsers()]);
      setCompany(co); setNomeEdit(co.nome || ""); setUsers(us);
    } catch(e) { showMsg(e.message||"Erro ao carregar",false); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const saveName = async () => {
    if (!nomeEdit.trim()) return;
    setSavingName(true);
    try {
      await api.renameCompany(nomeEdit.trim());
      setCompany(c=>({...c, nome:nomeEdit.trim()}));
      showMsg("Nome da empresa atualizado!");
    } catch(e){ showMsg(e.message||"Erro",false); }
    finally { setSavingName(false); }
  };

  const openNew  = () => { setForm({ tipo:"usuario" }); setModal("new"); };
  const openEdit = (u) => { setForm({ nome:u.nome, email:u.email, tipo:u.tipo, senha:"" }); setModal(u); };

  const saveUser = async () => {
    try {
      if (modal === "new") {
        const u = await api.adminCreateUser(form);
        setUsers(p=>[...p, u]);
        showMsg("Usuário criado!");
      } else {
        const payload = { nome:form.nome, email:form.email, tipo:form.tipo };
        if (form.senha) payload.senha = form.senha;
        const u = await api.adminUpdateUser(modal.id, payload);
        setUsers(p=>p.map(x=>x.id===u.id?u:x));
        showMsg("Usuário atualizado!");
      }
      setModal(null);
    } catch(e){ showMsg(e.message||"Erro",false); }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Remover "${u.nome}"?`)) return;
    try {
      await api.adminDeleteUser(u.id);
      setUsers(p=>p.filter(x=>x.id!==u.id));
      showMsg("Usuário removido.");
    } catch(e){ showMsg(e.message||"Erro",false); }
  };

  if (loading) return <p style={{color:C.muted,padding:20}}>Carregando...</p>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {toast && (
        <div style={{ position:"fixed", top:20, right:24, zIndex:999, background:toast.ok?C.green:C.red, color:"#fff", borderRadius:10, padding:"10px 18px", fontWeight:600, fontSize:13, boxShadow:"0 4px 16px rgba(0,0,0,.15)" }}>
          {toast.msg}
        </div>
      )}

      <div>
        <h2 style={{ fontSize:22, fontWeight:800 }}>Administração</h2>
        <p style={{ color:C.muted, fontSize:13 }}>Área restrita — apenas você tem acesso.</p>
      </div>

      {/* Nome da empresa */}
      <Card>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>Nome da Empresa</h3>
        <div style={{ display:"flex", gap:10 }}>
          <input
            value={nomeEdit} onChange={e=>setNomeEdit(e.target.value)}
            style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:14, fontFamily:"inherit", outline:"none" }}
          />
          <Btn variant="primary" onClick={saveName} disabled={savingName || nomeEdit===company?.nome}>
            {savingName?"Salvando...":"Salvar"}
          </Btn>
        </div>
        <p style={{ fontSize:11, color:C.muted, marginTop:8 }}>Este é o nome usado na tela de login (campo "Nome da empresa").</p>
      </Card>

      {/* Usuários */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ fontSize:15, fontWeight:700 }}>Usuários ({users.length})</h3>
          <Btn variant="primary" icon="plus" small onClick={openNew}>Novo usuário</Btn>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {users.map(u=>(
            <div key={u.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:C.bg, borderRadius:10, gap:12, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.primary},${C.blue})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:14, flexShrink:0 }}>
                  {(u.nome||"?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{u.nome} {u.id===currentUserId&&<span style={{fontSize:10,color:C.green,fontWeight:700}}>(você)</span>}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{u.email} · {TIPO_LABEL[u.tipo]||u.tipo}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <Btn small variant="ghost" icon="edit" onClick={()=>openEdit(u)}>Editar</Btn>
                {u.id!==currentUserId && <Btn small variant="danger" icon="trash" onClick={()=>deleteUser(u)}>Remover</Btn>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal novo/editar usuário */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setModal(null)}>
          <div style={{ background:C.surface, borderRadius:16, padding:28, width:380, boxShadow:"0 8px 40px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:16, fontWeight:800, marginBottom:18 }}>{modal==="new"?"Novo Usuário":"Editar Usuário"}</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                ["Nome completo","nome","text",true],
                ["E-mail","email","email", modal==="new"],
                ["Senha"+(modal!=="new"?" (deixe em branco para manter)":""),"senha","password", modal==="new"],
              ].map(([label,key,type,req])=>(
                <div key={key}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}{req&&" *"}</div>
                  <input
                    type={type} value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                    style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, fontFamily:"inherit", outline:"none" }}
                  />
                </div>
              ))}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Tipo</div>
                <select value={form.tipo||"usuario"} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}
                  style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, fontFamily:"inherit", background:C.surface }}>
                  <option value="usuario">Usuário</option>
                  <option value="dono">Dono (acesso total)</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveUser}>{modal==="new"?"Criar":"Salvar"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

//  SIDEBAR
const NAV = [
  { id:"dashboard",    label:"Dashboard",       icon:"dashboard"  },
  { id:"bills",        label:"Lançamentos",     icon:"bills"      },
  { id:"cashflow",     label:"Fluxo de Caixa",  icon:"cashflow"   },
  { id:"costcenters",  label:"Centros de Custo",icon:"tag"        },
  { id:"categories",   label:"Categorias",      icon:"tag"        },
  { id:"accounts",     label:"Contas",          icon:"accounts"   },
  { id:"contacts",     label:"Contatos",        icon:"contacts"   },
  { id:"import",       label:"Importar",        icon:"import"     },
  { id:"reports",      label:"Relatórios",      icon:"reports"    },
];

const SUPER_EMAIL = "claracg008@gmail.com";

const Sidebar = ({ active, onNav, collapsed, onToggle, isSuper }) => (
  <div style={{ width: collapsed?64:220, background:C.sidebar, height:"100vh", position:"fixed", left:0, top:0, display:"flex", flexDirection:"column", transition:"width .2s", zIndex:100, flexShrink:0 }}>
    {/* Finovo Logo */}
    <div style={{ padding: collapsed?"14px 10px":"16px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,.07)", justifyContent:collapsed?"center":"flex-start", background:"rgba(0,0,0,.15)" }}>
      {/* Finovo flower mark — SVG approximation of the petal logo */}
      <div style={{ width:36, height:36, flexShrink:0, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg viewBox="0 0 36 36" width="36" height="36">
          <ellipse cx="18" cy="10" rx="5.5" ry="9" fill="#0ea882" transform="rotate(0 18 18)"/>
          <ellipse cx="18" cy="10" rx="5.5" ry="9" fill="#f26522" transform="rotate(45 18 18)"/>
          <ellipse cx="18" cy="10" rx="5.5" ry="9" fill="#3b9fd4" transform="rotate(90 18 18)"/>
          <ellipse cx="18" cy="10" rx="5.5" ry="9" fill="#0f3d6e" transform="rotate(135 18 18)"/>
          <ellipse cx="18" cy="10" rx="5.5" ry="9" fill="#0ea882" transform="rotate(180 18 18)"/>
          <ellipse cx="18" cy="10" rx="5.5" ry="9" fill="#f26522" transform="rotate(225 18 18)"/>
          <ellipse cx="18" cy="10" rx="5.5" ry="9" fill="#3b9fd4" transform="rotate(270 18 18)"/>
          <ellipse cx="18" cy="10" rx="5.5" ry="9" fill="#0f3d6e" transform="rotate(315 18 18)"/>
          <circle cx="18" cy="18" r="3.5" fill="white"/>
        </svg>
      </div>
      {!collapsed && (
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:"#fff", lineHeight:1, letterSpacing:"0.08em", fontFamily:"'Montserrat',sans-serif" }}>FINOVO</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", letterSpacing:"0.18em", textTransform:"uppercase", marginTop:2 }}>Gestão Financeira</div>
        </div>
      )}
    </div>

    {/* Nav */}
    <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
      {NAV.map(n=>(
        <button key={n.id} onClick={()=>onNav(n.id)} style={{ display:"flex", alignItems:"center", gap:10, padding: collapsed?"10px 0":"10px 12px", justifyContent:collapsed?"center":"flex-start", borderRadius:8, border:"none", cursor:"pointer", transition:"all .15s", background: active===n.id ? "rgba(242,101,34,.18)" : "transparent", color: active===n.id ? "#f26522" : "rgba(255,255,255,.5)", width:"100%", fontFamily:"'Poppins',inherit", fontWeight:600, fontSize:12, borderLeft: active===n.id ? "3px solid #f26522" : "3px solid transparent" }}>
          <Icon name={n.icon} size={17} color={active===n.id?"#f26522":"rgba(255,255,255,.45)"} />
          {!collapsed && <span>{n.label}</span>}
        </button>
      ))}
      {isSuper && (
        <button onClick={()=>onNav("admin")} style={{ display:"flex", alignItems:"center", gap:10, padding: collapsed?"10px 0":"10px 12px", justifyContent:collapsed?"center":"flex-start", borderRadius:8, border:"none", cursor:"pointer", transition:"all .15s", background: active==="admin" ? "rgba(242,101,34,.18)" : "transparent", color: active==="admin" ? "#f26522" : "rgba(255,255,255,.5)", width:"100%", fontFamily:"'Poppins',inherit", fontWeight:600, fontSize:12, borderLeft: active==="admin" ? "3px solid #f26522" : "3px solid transparent", marginTop:8, borderTop:"1px solid rgba(255,255,255,.07)", paddingTop:14 }}>
          <Icon name="settings" size={17} color={active==="admin"?"#f26522":"rgba(255,255,255,.45)"} />
          {!collapsed && <span>Administração</span>}
        </button>
      )}
    </nav>

    {/* Toggle */}
    <button onClick={onToggle} style={{ margin:"12px 8px", padding:"8px 12px", borderRadius:8, border:"none", background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.4)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:collapsed?"center":"flex-start", gap:8, fontFamily:"inherit", fontSize:12 }}>
      <Icon name="menu" size={16} color="rgba(255,255,255,.4)" />
      {!collapsed && <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Recolher menu</span>}
    </button>
  </div>
);
//  ROOT APP
export default function App() {
  // Load SheetJS dynamically for spreadsheet import/export
  useEffect(()=>{
    if (window.XLSX) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => console.log("SheetJS loaded");
    document.head.appendChild(s);
  },[]);
  const [txs,       setTxs]       = useState([]);
  const [accounts,  setAccounts]  = useState([]);
  const [contacts,      setContacts]      = useState([]);
  const [costCenters,   setCostCenters]   = useState([]);
  const [userCatsRaw, setUserCatsRaw] = useState({ expense:[], income:[] }); // {expense:[{id,name,...}], income:[...]}
  const [page,      setPage]      = useState("dashboard");
  const [modal,     setModal]     = useState(null); // {type:"new"|"edit", tx?, recurrenceScope?}
  const [payModal,  setPayModal]  = useState(null); // tx a pagar
  const [recModal,  setRecModal]  = useState(null); // tx a editar com recorrência
  const [collapsed, setCollapsed] = useState(false);
  const [toast,     setToast]     = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const { user, logout } = useAuth();

  // ── Carrega tudo da API no início ────────────────────────────────────────
  const reloadAll = async () => {
    setLoadingData(true);
    try {
      const [txList, accList, ctList, ccList, catList] = await Promise.all([
        api.listTransactions(), api.listAccounts(), api.listContacts(),
        api.listCostCenters(), api.listCategories(),
      ]);
      setTxs(txList);
      setAccounts(accList);
      setContacts(ctList);
      setCostCenters(ccList);
      setUserCatsRaw({
        expense: catList.filter(c=>c.type==="expense"),
        income:  catList.filter(c=>c.type==="income"),
      });
    } catch (err) {
      showToast(err.message || "Erro ao carregar dados", "info");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { reloadAll(); }, []);

  // Expose costCenters/cats globally for TxForm access (mantém compatibilidade com componentes existentes)
  useEffect(()=>{ window.__costCenters = costCenters; },[costCenters]);
  useEffect(()=>{ window.__allTxs = txs; },[txs]);
  useEffect(()=>{
    window.__userCats = {
      expense: (userCatsRaw.expense||[]).map(c=>c.name),
      income:  (userCatsRaw.income||[]).map(c=>c.name),
    };
    CATS_EXPENSE = [...DEFAULT_CATS_EXPENSE, ...(window.__userCats.expense||[])];
    CATS_INCOME  = [...DEFAULT_CATS_INCOME,  ...(window.__userCats.income ||[])];
  },[userCatsRaw]);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  // ── Web Push Notifications ────────────────────────────────────────────────
  const [pushStatus,   setPushStatus]   = useState("idle"); // idle | granted | denied | unsupported
  const [showIOSBanner, setShowIOSBanner] = useState(false);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = window.navigator.standalone === true;

  useEffect(() => {
    const hasSW  = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = "Notification" in window;

    if (isIOS && !isInStandaloneMode) {
      setShowIOSBanner(true);
      setPushStatus("unsupported");
      return;
    }
    if (!hasSW || !hasPush || !hasNotif) {
      setPushStatus("unsupported");
      return;
    }
    // Registra o service worker
    navigator.serviceWorker.register("/sw.js").catch(console.error);
    // Verifica estado atual
    const perm = Notification.permission;
    if (perm === "granted") {
      // Confirma que existe subscription ativa
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => {
          setPushStatus(sub ? "granted" : "idle");
        })
      ).catch(() => setPushStatus("idle"));
    } else if (perm === "denied") {
      setPushStatus("denied");
    } else {
      setPushStatus("idle");
    }
  }, []);

  const enablePush = async () => {
    if (isIOS && !isInStandaloneMode) { setShowIOSBanner(true); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const { key } = await api.getVapidPublicKey();
      if (!key) throw new Error("Chave VAPID não disponível");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await api.subscribePush(sub.toJSON());
      setPushStatus("granted");
      showToast("Notificações ativadas! Você receberá alertas diários às 8h.");
    } catch (e) {
      console.error("push subscribe error:", e);
      if (Notification.permission === "denied") {
        setPushStatus("denied");
        showToast("Notificações bloqueadas. Habilite nas configurações do navegador.", "info");
      } else {
        showToast("Erro ao ativar notificações: " + (e.message || e), "info");
      }
    }
  };

  const disablePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await api.unsubscribePush(sub.endpoint); await sub.unsubscribe(); }
      setPushStatus("idle");
      showToast("Notificações desativadas.", "info");
    } catch(e) { console.error(e); }
  };

  // ── TX operations ─────────────────────────────────────────────────────────
  const saveTx = async (tx) => {
    const { seriesDates, ...txData } = tx;
    const isNew = !txs.find(t=>t.id===txData.id);
    const scope = modal?.recurrenceScope || "single";
    try {
      if (isNew) {
        const installments = seriesDates?.length || 1;
        const result = await api.createTransaction({ ...txData, installments });
        if (result.created) {
          setTxs(prev => [...result.created, ...prev]);
          showToast(`${result.created.length} lançamentos criados!`);
        } else {
          setTxs(prev => [result, ...prev]);
          showToast("Transação salva com sucesso!");
        }
      } else if (scope === "future" && txData.recurrenceGroupId) {
        const updated = await api.updateRecurrenceFrom(txData.recurrenceGroupId, txData.id, txData);
        setTxs(prev => { const m = new Map(updated.map(u=>[u.id,u])); return prev.map(t=>m.get(t.id)||t); });
        showToast(`${updated.length} lançamentos atualizados!`);
      } else if (scope === "all" && txData.recurrenceGroupId) {
        const updated = await api.updateRecurrenceAll(txData.recurrenceGroupId, txData);
        setTxs(prev => { const m = new Map(updated.map(u=>[u.id,u])); return prev.map(t=>m.get(t.id)||t); });
        showToast(`${updated.length} lançamentos atualizados!`);
      } else {
        const updated = await api.updateTransaction(txData.id, txData);
        setTxs(prev => prev.map(t => t.id===updated.id ? updated : t));
        showToast("Transação salva com sucesso!");
      }
      setModal(null);
    } catch (err) {
      showToast(err.message || "Erro ao salvar transação", "info");
      // Reativa o botão em caso de erro
      setModal(m => m ? { ...m, tx: { ...(m.tx||{}), _saving: false } } : m);
    }
  };

  // Abre modal de recorrência se necessário, senão abre TxForm direto
  const handleEdit = (tx) => {
    if (tx.recurrenceGroupId) {
      setRecModal(tx);
    } else {
      setModal({ type:"edit", tx });
    }
  };

  const deleteTx = async (id) => {
    try {
      await api.deleteTransaction(id);
      setTxs(p=>p.filter(t=>t.id!==id));
      showToast("Transação removida","info");
    } catch (err) {
      showToast(err.message || "Erro ao remover transação", "info");
    }
  };

  const duplicateTx = async (tx) => {
    try {
      const created = await api.duplicateTransaction(tx.id);
      setModal({ type:"edit", tx: created });
    } catch (err) {
      showToast(err.message || "Erro ao duplicar transação", "info");
    }
  };

  const bulkEditTxs = async (updatedList) => {
    try {
      const ids = updatedList.map(u=>u.id);
      // Deriva os "changes" comuns a partir do primeiro item modificado
      // (Bills aplica os mesmos campos de bulkForm a todos os itens selecionados)
      const sample = updatedList[0] || {};
      const original = txs.find(t=>t.id===sample.id) || {};
      const changes = {};
      for (const key of ["date","status","category","accountId","costCenterId","type"]) {
        if (sample[key] !== undefined && sample[key] !== original[key]) {
          changes[key] = sample[key] === "" ? "__clear__" : sample[key];
        }
      }
      const updated = await api.bulkEditTransactions(ids, changes);
      setTxs(prev => prev.map(t => updated.find(u=>u.id===t.id) || t));
      showToast(`${ids.length} lançamento${ids.length!==1?"s":""} atualizado${ids.length!==1?"s":""}!`);
    } catch (err) {
      showToast(err.message || "Erro na edição em massa", "info");
    }
  };

  const markPaid = (id) => {
    const tx = txs.find(t=>t.id===id);
    if (tx) setPayModal(tx);
  };

  const confirmPaid = async (tx, dataPagamento) => {
    try {
      const updated = await api.updateTransaction(tx.id, { ...tx, status:"pago", paidAt: dataPagamento });
      setTxs(p=>p.map(t=>t.id===tx.id ? updated : t));
      setPayModal(null);
      showToast("Pagamento registrado!");
    } catch (err) {
      showToast(err.message || "Erro ao registrar pagamento", "info");
    }
  };

  // ── Account operations ──────────────────────────────────────────────────
  const saveAccount = async (acc) => {
    try {
      const exists = accounts.find(a=>a.id===acc.id);
      if (exists) {
        const updated = await api.updateAccount(acc.id, acc);
        setAccounts(p=>p.map(a=>a.id===acc.id?updated:a));
      } else {
        const created = await api.createAccount(acc);
        setAccounts(p=>[...p, created]);
      }
      showToast("Conta salva!");
    } catch (err) {
      showToast(err.message || "Erro ao salvar conta", "info");
    }
  };
  const deleteAccount = async (id) => {
    try {
      await api.deleteAccount(id);
      setAccounts(p=>p.filter(a=>a.id!==id));
      showToast("Conta removida","info");
    } catch (err) {
      showToast(err.message || "Erro ao remover conta", "info");
    }
  };

  // ── Contact operations ──────────────────────────────────────────────────
  const saveContact = async (c) => {
    try {
      const created = await api.createContact(c);
      setContacts(p=>[...p, created]);
      showToast("Contato adicionado!");
    } catch (err) {
      showToast(err.message || "Erro ao salvar contato", "info");
    }
  };
  const deleteContact = async (id) => {
    try {
      await api.deleteContact(id);
      setContacts(p=>p.filter(c=>c.id!==id));
      showToast("Contato removido","info");
    } catch (err) {
      showToast(err.message || "Erro ao remover contato", "info");
    }
  };

  // ── Cost centers (wrapper síncrono → API, mantém assinatura setCostCenters) ─
  const setCostCentersApi = async (updater) => {
    const next = typeof updater === "function" ? updater(costCenters) : updater;
    // Detecta diffs simples: novo item sem id reconhecido = criar; removido = deletar; alterado = atualizar
    const prevIds = new Set(costCenters.map(c=>c.id));
    const nextIds = new Set(next.map(c=>c.id));
    try {
      for (const cc of next) {
        if (!prevIds.has(cc.id)) {
          const created = await api.createCostCenter(cc);
          cc.id = created.id; // sincroniza id gerado pelo banco
        }
      }
      for (const cc of costCenters) {
        if (!nextIds.has(cc.id)) await api.deleteCostCenter(cc.id);
      }
      for (const cc of next) {
        const prev = costCenters.find(p=>p.id===cc.id);
        if (prev && JSON.stringify(prev) !== JSON.stringify(cc)) {
          await api.updateCostCenter(cc.id, cc);
        }
      }
      const fresh = await api.listCostCenters();
      setCostCenters(fresh);
    } catch (err) {
      showToast(err.message || "Erro ao atualizar centros de custo", "info");
    }
  };

  // ── Categories (wrapper para manter compatibilidade com CategoriesPage) ──
  const setUserCatsApi = async (updater) => {
    const current = { expense:userCatsRaw.expense||[], income:userCatsRaw.income||[] };
    const next = typeof updater === "function" ? updater(current) : updater;
    try {
      for (const type of ["expense","income"]) {
        const prevList = current[type]||[];
        const nextList = next[type]||[];
        const prevIds = new Set(prevList.map(c=>c.id));
        const nextIds = new Set(nextList.map(c=>c.id));
        for (const c of nextList) {
          if (!prevIds.has(c.id) && !c.isDefault) {
            await api.createCategory({ name:c.name, type, icon:c.icon, color:c.color });
          }
        }
        for (const c of prevList) {
          if (!nextIds.has(c.id) && !c.isDefault) {
            await api.deleteCategory(c.id);
          }
        }
        for (const c of nextList) {
          const prev = prevList.find(p=>p.id===c.id);
          if (prev && !c.isDefault && (prev.name!==c.name || prev.icon!==c.icon || prev.color!==c.color)) {
            await api.updateCategory(c.id, { name:c.name, icon:c.icon, color:c.color });
          }
        }
      }
      const catList = await api.listCategories();
      setUserCatsRaw({
        expense: catList.filter(c=>c.type==="expense"),
        income:  catList.filter(c=>c.type==="income"),
      });
    } catch (err) {
      showToast(err.message || "Erro ao atualizar categorias", "info");
    }
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async (rows, batchId, source) => {
    try {
      const result = await api.importTransactions(rows, batchId);
      setTxs(p=>[...result.created, ...p]);
      showToast(`${result.created.length} transações importadas de "${source||"arquivo"}"!`);
      return { imported: result.created.length, duplicates: 0 };
    } catch (err) {
      showToast(err.message || "Erro ao importar", "info");
      return { imported: 0, duplicates: 0 };
    }
  };
  const handleDeleteBatch = async (batchId) => {
    try {
      const result = await api.deleteImportBatch(batchId);
      setTxs(prev => prev.filter(t=>t.importBatchId!==batchId));
      showToast(result.message || "Importação desfeita", "info");
    } catch (err) {
      showToast(err.message || "Erro ao desfazer importação", "info");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await api.deleteRecurrenceGroup(groupId);
      setTxs(prev => prev.filter(t => t.recurrenceGroupId !== groupId));
      showToast("Série removida", "info");
    } catch (err) {
      showToast(err.message || "Erro ao remover série", "info");
    }
  };

  const sideW = collapsed ? 64 : 220;

  // Alerts count
  const overdueCount = txs.filter(t=>t.status==="vencido").length;
  const pendingCount = txs.filter(t=>t.status==="pendente").length;

  if (loadingData) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"'Poppins',sans-serif", color:C.muted }}>
        Carregando FINOVO...
      </div>
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:"'Poppins','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Montserrat:wght@400;600;700;800&display=swap'); * { box-sizing: border-box; font-family: 'Poppins', sans-serif; } ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#c5cfdf;border-radius:3px} input[type=number]::-webkit-inner-spin-button{opacity:.5} button:focus{outline:none}`}</style>

      <Sidebar active={page} onNav={setPage} collapsed={collapsed} onToggle={()=>setCollapsed(v=>!v)} isSuper={(user?.email||"").toLowerCase()===SUPER_EMAIL} />

      <div style={{ marginLeft:sideW, flex:1, display:"flex", flexDirection:"column", minHeight:"100vh", transition:"margin .2s" }}>

        {/* Banner iOS — instrução para adicionar à tela inicial */}
        {showIOSBanner && (
          <div style={{ background:"#1c3a6b", color:"#fff", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", fontSize:13 }}>
            <span>📱 <strong>iPhone/iPad:</strong> Para receber notificações, adicione o FINOVO à tela inicial — toque em <strong>Compartilhar</strong> → <strong>"Adicionar à Tela de Início"</strong>, depois reabra o app por lá.</span>
            <button onClick={()=>setShowIOSBanner(false)} style={{ background:"none", border:"1px solid rgba(255,255,255,.4)", borderRadius:6, color:"#fff", padding:"3px 10px", cursor:"pointer", fontSize:12, flexShrink:0 }}>Entendi</button>
          </div>
        )}

        {/* Topbar — Finovo */}
        <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"10px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 8px rgba(15,30,61,.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:3, height:20, background:C.orange, borderRadius:2 }} />
            <span style={{ fontSize:14, color:C.text, fontWeight:700, letterSpacing:"0.01em" }}>{NAV.find(n=>n.id===page)?.label}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {(overdueCount+pendingCount)>0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, background:C.redLight, borderRadius:8, padding:"5px 12px", cursor:"pointer", border:`1px solid ${C.red}33` }} onClick={()=>setPage("bills")}>
                <Icon name="bell" size={13} color={C.red} />
                <span style={{ fontSize:11, fontWeight:700, color:C.red }}>{overdueCount} vencidas · {pendingCount} pendentes</span>
              </div>
            )}

            {/* Botão de notificações push */}
            {pushStatus === "unsupported" ? null : pushStatus === "denied" ? (
              <div title="Notificações bloqueadas. Habilite nas configurações do navegador." style={{ display:"flex", alignItems:"center", gap:5, background:C.bg, borderRadius:8, padding:"5px 10px", border:`1px solid ${C.border}`, cursor:"default", opacity:.6 }}>
                <Icon name="bell" size={13} color={C.muted} />
                <span style={{ fontSize:11, color:C.muted }}>Bloqueado</span>
              </div>
            ) : pushStatus === "granted" ? (
              <div onClick={disablePush} title="Desativar notificações" style={{ display:"flex", alignItems:"center", gap:5, background:C.greenLight, borderRadius:8, padding:"5px 10px", border:`1px solid ${C.green}44`, cursor:"pointer" }}>
                <Icon name="bell" size={13} color={C.green} />
                <span style={{ fontSize:11, fontWeight:600, color:C.green }}>Notificações ativas</span>
              </div>
            ) : (
              <div onClick={enablePush} title="Ativar alertas de vencimento" style={{ display:"flex", alignItems:"center", gap:5, background:C.blueLight, borderRadius:8, padding:"5px 10px", border:`1px solid ${C.blue}44`, cursor:"pointer" }}>
                <Icon name="bell" size={13} color={C.blue} />
                <span style={{ fontSize:11, fontWeight:600, color:C.blue }}>Ativar alertas</span>
              </div>
            )}

            <Btn variant="primary" small icon="plus" onClick={()=>setModal({type:"new"})}>Novo</Btn>
            <div style={{ position:"relative" }}>
              <div
                title={`${user?.name||""} · ${user?.organizationName||""} (clique para sair)`}
                onClick={()=>{ if(confirm("Deseja sair da sua conta?")) logout(); }}
                style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${C.primary},${C.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:"#fff", cursor:"pointer", boxShadow:"0 2px 8px rgba(13,79,160,.3)" }}>
                {(user?.name||"U").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex:1, padding:"28px 32px", maxWidth:1200, width:"100%", margin:"0 auto" }}>
          {page==="dashboard"   && <Dashboard txs={txs} accounts={accounts} contacts={contacts} costCenters={costCenters} onNew={()=>setModal({type:"new"})} />}
          {page==="bills"       && <Bills txs={txs} accounts={accounts} contacts={contacts} costCenters={costCenters} onAdd={()=>setModal({type:"new"})} onEdit={handleEdit} onDelete={deleteTx} onMarkPaid={markPaid} onBulkEdit={bulkEditTxs} onDuplicate={duplicateTx} />}
          {page==="cashflow"    && <Cashflow txs={txs} />}
          {page==="accounts"    && <Accounts accounts={accounts} txs={txs} onAdd={saveAccount} onEdit={a=>saveAccount(a)} onDelete={deleteAccount} />}
          {page==="costcenters" && <CostCentersPage costCenters={costCenters} setCostCenters={setCostCentersApi} txs={txs} />}
          {page==="categories"  && <CategoriesPage userCats={userCatsRaw} setUserCats={setUserCatsApi} />}
          {page==="contacts"    && <Contacts contacts={contacts} txs={txs} onAdd={saveContact} onDelete={deleteContact} />}
          {page==="import"      && <ImportPage accounts={accounts} contacts={contacts} costCenters={costCenters} onImport={handleImport} onDeleteBatch={handleDeleteBatch} />}
          {page==="reports"     && <Reports txs={txs} accounts={accounts} contacts={contacts} costCenters={costCenters} />}
          {page==="admin" && (user?.email||"").toLowerCase()===SUPER_EMAIL && <AdminPage currentUserId={user?.id} />}
        </main>
      </div>

      {/* Modal de transação */}
      {modal && (
        <Modal title={modal.type==="new"?"Nova Transação":"Editar Transação"} onClose={()=>setModal(null)} width={580}>
          <TxForm initial={modal.tx} accounts={accounts} contacts={contacts} onSave={saveTx} onClose={()=>setModal(null)} />
        </Modal>
      )}

      {/* Modal de pagamento */}
      {payModal && (
        <PayModal tx={payModal} onConfirm={(data)=>confirmPaid(payModal,data)} onClose={()=>setPayModal(null)} />
      )}

      {/* Modal de edição de recorrência */}
      {recModal && (
        <RecurrenceEditModal
          tx={recModal}
          onChoice={(scope)=>{ setRecModal(null); setModal({ type:"edit", tx:recModal, recurrenceScope:scope }); }}
          onClose={()=>setRecModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background: toast.type==="info"?C.sidebar:C.green, color:"#fff", borderRadius:10, padding:"12px 20px", fontSize:13, fontWeight:600, zIndex:2000, boxShadow:"0 8px 24px rgba(0,0,0,.15)", animation:"slideUp .3s ease" }}>
          <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

