import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Avatar from "./Avatar";
import { cores, espaco } from "../tema";
import { formatarQuando, nomeDaConversa, corDaConversa } from "../utils";

/** Uma linha da lista de conversas (avatar, nome, prévia, hora e badge). */
export default function ItemConversa({ conversa, usuarioAtual, aoAbrir }) {
  const nome = nomeDaConversa(conversa, usuarioAtual.id);
  const ultima = conversa.ultimaMensagem;
  const souAutor = ultima && ultima.autorId === usuarioAtual.id;

  const autorDaUltima = ultima
    ? (conversa.participantesDetalhes || []).find((p) => p.id === ultima.autorId)
    : null;

  const prefixo = souAutor ? "Você: " : conversa.titulo && autorDaUltima ? `${autorDaUltima.nome}: ` : "";
  const previa = ultima ? `${prefixo}${ultima.texto}` : "Nenhuma mensagem ainda";

  return (
    <TouchableOpacity style={styles.linha} onPress={() => aoAbrir(conversa)} activeOpacity={0.6}>
      <Avatar nome={nome} cor={corDaConversa(conversa, usuarioAtual.id)} />

      <View style={styles.meio}>
        <Text style={styles.nome} numberOfLines={1}>
          {nome}
        </Text>
        <Text
          style={[styles.previa, conversa.naoLidas > 0 && styles.previaNaoLida]}
          numberOfLines={1}
        >
          {previa}
        </Text>
      </View>

      <View style={styles.direita}>
        <Text style={styles.hora}>{formatarQuando(conversa.atualizadaEm)}</Text>
        {conversa.naoLidas > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>{conversa.naoLidas > 99 ? "99+" : conversa.naoLidas}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: espaco.md,
    paddingHorizontal: espaco.lg,
    backgroundColor: cores.branco,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  meio: { flex: 1, marginLeft: espaco.md },
  nome: { fontSize: 16, fontWeight: "600", color: cores.texto },
  previa: { marginTop: 2, fontSize: 14, color: cores.textoSuave },
  previaNaoLida: { color: cores.texto, fontWeight: "500" },
  direita: { alignItems: "flex-end", marginLeft: espaco.sm, minWidth: 56 },
  hora: { fontSize: 12, color: cores.textoSuave },
  badge: {
    marginTop: espaco.xs,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTexto: { color: cores.branco, fontSize: 12, fontWeight: "700" },
});
