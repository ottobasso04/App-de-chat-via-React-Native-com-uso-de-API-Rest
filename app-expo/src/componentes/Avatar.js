import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { iniciais } from "../utils";
import { cores } from "../tema";

/** Círculo colorido com as iniciais do nome. */
export default function Avatar({ nome, cor = cores.destaque, tamanho = 48 }) {
  const estilo = {
    width: tamanho,
    height: tamanho,
    borderRadius: tamanho / 2,
    backgroundColor: cor,
  };

  return (
    <View style={[styles.base, estilo]}>
      <Text style={[styles.texto, { fontSize: tamanho * 0.38 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  texto: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
