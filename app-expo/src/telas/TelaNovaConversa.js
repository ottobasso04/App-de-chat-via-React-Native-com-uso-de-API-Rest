import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import Avatar from "../componentes/Avatar";
import Vazio from "../componentes/Vazio";
import { cores, espaco, raio } from "../tema";
import { alertar } from "../utils";
import { listarUsuarios, criarConversa } from "../api";

/**
 * Seleciona um contato (conversa individual) ou vários (grupo)
 * e cria a conversa no servidor.
 */
export default function TelaNovaConversa({ usuarioAtual, aoVoltar, aoCriar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const buscarUsuarios = useCallback(async () => {
    try {
      const dados = await listarUsuarios();
      const outros = (Array.isArray(dados) ? dados : []).filter((u) => u.id !== usuarioAtual.id);
      setUsuarios(outros);
    } catch (e) {
      alertar("Erro", e.message);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [usuarioAtual.id]);

  useEffect(() => {
    buscarUsuarios();
  }, [buscarUsuarios]);

  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    buscarUsuarios();
  }, [buscarUsuarios]);

  function alternar(id) {
    setSelecionados((atuais) =>
      atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id]
    );
  }

  /** POST /conversas com validação. */
  async function handleCriar() {
    if (selecionados.length === 0) {
      return alertar("Validação", "Selecione pelo menos uma pessoa.");
    }
    const ehGrupo = selecionados.length > 1;
    if (ehGrupo && !titulo.trim()) {
      return alertar("Validação", "Dê um nome ao grupo.");
    }

    try {
      setSalvando(true);
      const conversa = await criarConversa(selecionados, ehGrupo ? titulo.trim() : null);
      aoCriar(conversa);
    } catch (e) {
      alertar("Erro ao criar conversa", e.message);
    } finally {
      setSalvando(false);
    }
  }

  const ehGrupo = selecionados.length > 1;

  return (
    <KeyboardAvoidingView
      style={styles.tela}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={aoVoltar} style={styles.voltar}>
          <Text style={styles.voltarTexto}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Nova conversa</Text>
          <Text style={styles.subtitulo}>
            {selecionados.length === 0
              ? "Selecione um contato"
              : `${selecionados.length} selecionado(s)${ehGrupo ? " · grupo" : ""}`}
          </Text>
        </View>
      </View>

      {ehGrupo && (
        <View style={styles.caixaTitulo}>
          <TextInput
            style={styles.input}
            placeholder="Nome do grupo"
            placeholderTextColor={cores.textoSuave}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={40}
          />
        </View>
      )}

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={[cores.primaria]} />
          }
          ListEmptyComponent={
            <Vazio
              icone="🙋"
              titulo="Ninguém mais cadastrado"
              descricao="Abra o app em outro dispositivo (ou aba) e crie outro usuário para conversar."
            />
          }
          renderItem={({ item }) => {
            const ativo = selecionados.includes(item.id);
            return (
              <TouchableOpacity
                style={[styles.contato, ativo && styles.contatoAtivo]}
                onPress={() => alternar(item.id)}
                activeOpacity={0.6}
              >
                <Avatar nome={item.nome} cor={item.cor} tamanho={44} />
                <Text style={styles.contatoNome}>{item.nome}</Text>
                <View style={[styles.marcador, ativo && styles.marcadorAtivo]}>
                  {ativo && <Text style={styles.marcadorTexto}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.botao, (salvando || selecionados.length === 0) && styles.botaoDesativado]}
        onPress={handleCriar}
        disabled={salvando || selecionados.length === 0}
      >
        {salvando ? (
          <ActivityIndicator color={cores.branco} />
        ) : (
          <Text style={styles.botaoTexto}>{ehGrupo ? "Criar grupo" : "Iniciar conversa"}</Text>
        )}
      </TouchableOpacity>
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
  voltar: { paddingHorizontal: espaco.sm, paddingVertical: espaco.xs, marginRight: espaco.sm },
  voltarTexto: { color: cores.branco, fontSize: 24, lineHeight: 26 },
  titulo: { color: cores.branco, fontSize: 17, fontWeight: "700" },
  subtitulo: { color: "#CFE9E4", fontSize: 12, marginTop: 2 },
  caixaTitulo: {
    padding: espaco.md,
    backgroundColor: "#F4F6F7",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  input: {
    height: 44,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.branco,
    paddingHorizontal: espaco.md,
    color: cores.texto,
  },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contato: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: espaco.md,
    paddingHorizontal: espaco.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  contatoAtivo: { backgroundColor: "#EAF7EF" },
  contatoNome: { flex: 1, marginLeft: espaco.md, fontSize: 16, color: cores.texto, fontWeight: "500" },
  marcador: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.borda,
    alignItems: "center",
    justifyContent: "center",
  },
  marcadorAtivo: { backgroundColor: cores.destaque, borderColor: cores.destaque },
  marcadorTexto: { color: cores.branco, fontSize: 13, fontWeight: "700" },
  botao: {
    margin: espaco.lg,
    height: 50,
    borderRadius: raio.md,
    backgroundColor: cores.primaria,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoDesativado: { opacity: 0.5 },
  botaoTexto: { color: cores.branco, fontWeight: "700", fontSize: 15 },
});
