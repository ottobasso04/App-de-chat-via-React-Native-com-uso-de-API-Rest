import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { cores, espaco } from "../tema";

/** Estado vazio: usado quando não há conversas ou mensagens. */
export default function Vazio({ icone = "💬", titulo, descricao }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icone}>{icone}</Text>
      <Text style={styles.titulo}>{titulo}</Text>
      {!!descricao && <Text style={styles.descricao}>{descricao}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: espaco.xl * 2,
    paddingHorizontal: espaco.xl,
  },
  icone: { fontSize: 42, marginBottom: espaco.md },
  titulo: { fontSize: 16, fontWeight: "600", color: cores.texto, textAlign: "center" },
  descricao: {
    marginTop: espaco.sm,
    fontSize: 14,
    color: cores.textoSuave,
    textAlign: "center",
    lineHeight: 20,
  },
});
