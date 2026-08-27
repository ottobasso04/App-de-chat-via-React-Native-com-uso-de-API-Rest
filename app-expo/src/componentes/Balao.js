import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { cores, espaco, raio } from "../tema";
import { formatarHora } from "../utils";

/** Balão de mensagem. Verde e à direita quando a mensagem é minha. */
export default function Balao({ mensagem, souAutor, mostrarAutor, aoPressionarLongo }) {
  return (
    <TouchableOpacity
      activeOpacity={souAutor ? 0.7 : 1}
      onLongPress={souAutor ? () => aoPressionarLongo(mensagem) : undefined}
      style={[styles.container, souAutor ? styles.direita : styles.esquerda]}
    >
      <View style={[styles.balao, souAutor ? styles.balaoProprio : styles.balaoOutro]}>
        {!souAutor && mostrarAutor && (
          <Text style={[styles.autor, { color: mensagem.autor?.cor || cores.primaria }]}>
            {mensagem.autor?.nome || "Alguém"}
          </Text>
        )}

        <Text style={styles.texto}>{mensagem.texto}</Text>

        <View style={styles.rodape}>
          <Text style={styles.hora}>{formatarHora(mensagem.criadaEm)}</Text>
          {souAutor && (
            <Text style={[styles.tique, (mensagem.lidaPor || []).length > 1 && styles.tiqueLido]}>
              {(mensagem.lidaPor || []).length > 1 ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: espaco.md, marginVertical: 3, flexDirection: "row" },
  esquerda: { justifyContent: "flex-start" },
  direita: { justifyContent: "flex-end" },
  balao: {
    maxWidth: "80%",
    paddingHorizontal: espaco.md,
    paddingTop: espaco.sm,
    paddingBottom: 6,
    borderRadius: raio.lg,
  },
  balaoProprio: { backgroundColor: cores.balaoProprio, borderTopRightRadius: raio.sm },
  balaoOutro: { backgroundColor: cores.balaoOutro, borderTopLeftRadius: raio.sm },
  autor: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  texto: { fontSize: 15, color: cores.texto, lineHeight: 20 },
  rodape: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 2 },
  hora: { fontSize: 11, color: cores.textoSuave },
  tique: { fontSize: 11, color: cores.textoSuave, marginLeft: 4 },
  tiqueLido: { color: "#34B7F1" },
});
