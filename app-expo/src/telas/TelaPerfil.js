import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";

import Avatar from "../componentes/Avatar";
import { cores, espaco, raio } from "../tema";
import { alertar } from "../utils";
import { atualizarUsuario } from "../api";

// Cores disponíveis para o avatar de iniciais.
const PALETA = ["#25D366", "#128C7E", "#34B7F1", "#7E57C2", "#EF6C00", "#D81B60", "#00897B", "#5E6BC0"];

/**
 * Perfil: troca o nome exibido e a cor do avatar.
 * O usuário de login não muda — é a identidade da conta.
 */
export default function TelaPerfil({ usuarioAtual, aoVoltar, aoSalvar }) {
  const [nome, setNome] = useState(usuarioAtual.nome);
  const [cor, setCor] = useState(usuarioAtual.cor);
  const [salvando, setSalvando] = useState(false);

  const houveMudanca = nome.trim() !== usuarioAtual.nome || cor !== usuarioAtual.cor;

  /** PUT /usuarios/:id — o servidor confere pelo token que é você mesmo. */
  async function handleSalvar() {
    const limpo = nome.trim();

    if (!limpo) return alertar("Validação", "O nome não pode ficar vazio.");
    if (limpo.length < 2) return alertar("Validação", "O nome precisa ter pelo menos 2 caracteres.");
    if (limpo.length > 30) return alertar("Validação", "O nome pode ter no máximo 30 caracteres.");

    const campos = {};
    if (limpo !== usuarioAtual.nome) campos.nome = limpo;
    if (cor !== usuarioAtual.cor) campos.cor = cor;

    if (Object.keys(campos).length === 0) {
      return alertar("Nada para salvar", "Você não alterou nenhuma informação.");
    }

    try {
      setSalvando(true);
      const atualizado = await atualizarUsuario(usuarioAtual.id, campos);
      aoSalvar(atualizado);
      alertar("Perfil atualizado", "Seu novo nome já aparece para todo mundo.");
    } catch (e) {
      alertar("Erro ao salvar", e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={aoVoltar} style={styles.voltar}>
          <Text style={styles.voltarTexto}>←</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Editar perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.areaAvatar}>
          <Avatar nome={nome || usuarioAtual.nome} cor={cor} tamanho={110} />
          <Text style={styles.login}>@{usuarioAtual.usuario}</Text>
          <Text style={styles.loginDica}>O usuário de login não muda</Text>
        </View>

        <Text style={styles.rotulo}>Nome exibido</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          maxLength={30}
          placeholder="Como você quer ser chamado"
          placeholderTextColor={cores.textoSuave}
          returnKeyType="done"
          onSubmitEditing={handleSalvar}
        />
        <Text style={styles.dica}>
          Aparece nas conversas para todo mundo · {30 - nome.length} caracteres restantes
        </Text>

        <Text style={styles.rotulo}>Cor do avatar</Text>
        <View style={styles.paleta}>
          {PALETA.map((opcao) => (
            <TouchableOpacity
              key={opcao}
              style={[styles.amostra, { backgroundColor: opcao }, cor === opcao && styles.amostraAtiva]}
              onPress={() => setCor(opcao)}
            >
              {cor === opcao && <Text style={styles.amostraCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.botaoSalvar, (salvando || !houveMudanca) && styles.botaoDesativado]}
          onPress={handleSalvar}
          disabled={salvando || !houveMudanca}
        >
          {salvando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={styles.botaoSalvarTexto}>Salvar alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.branco },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.primaria,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
  },
  voltar: { paddingHorizontal: espaco.sm, marginRight: espaco.xs },
  voltarTexto: { color: cores.branco, fontSize: 24, lineHeight: 26 },
  titulo: { color: cores.branco, fontSize: 17, fontWeight: "700" },

  conteudo: { padding: espaco.lg, paddingBottom: espaco.xl * 2 },

  areaAvatar: { alignItems: "center", marginBottom: espaco.lg },
  login: { marginTop: espaco.md, fontSize: 16, fontWeight: "700", color: cores.texto },
  loginDica: { marginTop: 2, fontSize: 12, color: cores.textoSuave },

  rotulo: {
    marginTop: espaco.md,
    marginBottom: espaco.sm,
    fontSize: 13,
    fontWeight: "700",
    color: cores.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: 15,
    color: cores.texto,
    backgroundColor: "#F7F9FA",
  },
  dica: { marginTop: espaco.xs, fontSize: 12, color: cores.textoSuave },

  paleta: { flexDirection: "row", flexWrap: "wrap" },
  amostra: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: espaco.md,
    marginBottom: espaco.md,
    alignItems: "center",
    justifyContent: "center",
  },
  amostraAtiva: { borderWidth: 3, borderColor: cores.texto },
  amostraCheck: { color: cores.branco, fontWeight: "700" },

  botaoSalvar: {
    marginTop: espaco.lg,
    height: 50,
    borderRadius: raio.md,
    backgroundColor: cores.primaria,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoDesativado: { opacity: 0.5 },
  botaoSalvarTexto: { color: cores.branco, fontWeight: "700", fontSize: 15 },
});
