/** Funções auxiliares de formatação e de mensagens ao usuário. */

import { Alert, Platform } from "react-native";

/** Iniciais para o avatar: "Ana Paula" -> "AP" */
export function iniciais(nome = "") {
  const partes = String(nome).trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** 14:35 */
export function formatarHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** "14:35" se for hoje, "Ontem" ou "27/08/2026" */
export function formatarQuando(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";

  const hoje = new Date();
  const mesmoDia = (a, b) => a.toDateString() === b.toDateString();
  if (mesmoDia(d, hoje)) return formatarHora(iso);

  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (mesmoDia(d, ontem)) return "Ontem";

  return d.toLocaleDateString("pt-BR");
}

/** Separador de dia dentro do chat. */
export function rotuloDoDia(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Alert do React Native não existe na web — aqui um wrapper que
 * funciona nos dois ambientes.
 */
export function alertar(titulo, mensagem) {
  if (Platform.OS === "web") {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

export function confirmar(titulo, mensagem, aoConfirmar, textoBotao = "Confirmar") {
  if (Platform.OS === "web") {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) aoConfirmar();
    return;
  }
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: textoBotao, style: "destructive", onPress: aoConfirmar },
  ]);
}

/** Nome que aparece na lista: título do grupo ou nome do outro participante. */
export function nomeDaConversa(conversa, usuarioAtualId) {
  if (!conversa) return "";
  if (conversa.titulo) return conversa.titulo;

  const outros = (conversa.participantesDetalhes || []).filter((p) => p.id !== usuarioAtualId);
  if (outros.length === 0) return "Você";
  return outros.map((p) => p.nome).join(", ");
}

/** Cor do avatar da conversa. */
export function corDaConversa(conversa, usuarioAtualId, padrao = "#25D366") {
  if (!conversa) return padrao;
  if (conversa.titulo) return "#128C7E";
  const outro = (conversa.participantesDetalhes || []).find((p) => p.id !== usuarioAtualId);
  return outro?.cor || padrao;
}
