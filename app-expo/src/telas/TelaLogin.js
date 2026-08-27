import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import Avatar from "../componentes/Avatar";
import Vazio from "../componentes/Vazio";
import { cores, espaco, raio } from "../tema";
import { alertar } from "../utils";
import { listarUsuarios, criarUsuario, verificarServidor, getApiUrl, setApiUrl } from "../api";

/**
 * Tela de entrada: escolher (ou criar) o usuário que vai usar o app.
 * Como o app pode rodar em vários dispositivos ao mesmo tempo, cada um
 * entra com um usuário diferente e a conversa acontece de verdade.
 */
export default function TelaLogin({ aoEntrar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(null);

  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);

  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const [endereco, setEndereco] = useState(getApiUrl());

  /** GET /usuarios — memorizado com useCallback para referência estável. */
  const buscarUsuarios = useCallback(async () => {
    try {
      setErro(null);
      await verificarServidor();
      const dados = await listarUsuarios();
      setUsuarios(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setErro(e.message);
      setUsuarios([]);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  // Efeito de montagem: primeira busca.
  useEffect(() => {
    buscarUsuarios();
  }, [buscarUsuarios]);

  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    buscarUsuarios();
  }, [buscarUsuarios]);

  /** POST /usuarios com validação do formulário. */
  async function handleCriar() {
    const limpo = nome.trim();

    if (!limpo) return alertar("Validação", "Digite um nome para entrar.");
    if (limpo.length < 2) return alertar("Validação", "O nome precisa ter pelo menos 2 caracteres.");
    if (limpo.length > 30) return alertar("Validação", "O nome pode ter no máximo 30 caracteres.");
    if (usuarios.some((u) => u.nome.toLowerCase() === limpo.toLowerCase())) {
      return alertar("Validação", `Já existe alguém chamado "${limpo}". Toque no nome na lista para entrar.`);
    }

    try {
      setCriando(true);
      const novo = await criarUsuario(limpo);
      setNome("");
      setUsuarios((antigos) => [...antigos, novo]);
      aoEntrar(novo);
    } catch (e) {
      alertar("Erro ao criar usuário", e.message);
    } finally {
      setCriando(false);
    }
  }

  function aplicarEndereco() {
    const url = setApiUrl(endereco);
    setEndereco(url);
    setCarregando(true);
    buscarUsuarios();
  }

  return (
    <KeyboardAvoidingView
      style={styles.tela}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.cabecalho}>
        <Text style={styles.logo}>ZapZap</Text>
        <Text style={styles.subtitulo}>Escolha quem você é para começar a conversar</Text>
      </View>

      <View style={styles.conteudo}>
        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={cores.primaria} />
            <Text style={styles.carregandoTexto}>Conectando em {getApiUrl()}…</Text>
          </View>
        ) : (
          <FlatList
            data={usuarios}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={[cores.primaria]} />
            }
            ListHeaderComponent={
              erro ? (
                <View style={styles.erroCaixa}>
                  <Text style={styles.erroTitulo}>Não consegui falar com o servidor</Text>
                  <Text style={styles.erroTexto}>{erro}</Text>
                  <Text style={styles.erroDica}>
                    Rode `node server.js` na pasta servidor/ e confira o endereço abaixo.
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !erro ? (
                <Vazio
                  icone="👤"
                  titulo="Nenhum usuário cadastrado"
                  descricao="Digite um nome no campo abaixo para criar o primeiro."
                />
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.usuario} onPress={() => aoEntrar(item)} activeOpacity={0.6}>
                <Avatar nome={item.nome} cor={item.cor} tamanho={44} />
                <Text style={styles.usuarioNome}>{item.nome}</Text>
                <Text style={styles.entrar}>Entrar →</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <View style={styles.formulario}>
        <View style={styles.linhaForm}>
          <TextInput
            style={styles.input}
            placeholder="Ou digite um nome novo"
            placeholderTextColor={cores.textoSuave}
            value={nome}
            onChangeText={setNome}
            maxLength={30}
            returnKeyType="done"
            onSubmitEditing={handleCriar}
          />
          <TouchableOpacity
            style={[styles.botao, criando && styles.botaoDesativado]}
            onPress={handleCriar}
            disabled={criando}
          >
            {criando ? (
              <ActivityIndicator color={cores.branco} />
            ) : (
              <Text style={styles.botaoTexto}>Criar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.linhaAvancado}>
          <Text style={styles.avancadoLabel}>Configurar servidor</Text>
          <Switch
            value={mostrarAvancado}
            onValueChange={setMostrarAvancado}
            trackColor={{ true: cores.destaque, false: "#CFD8DC" }}
          />
        </View>

        {mostrarAvancado && (
          <View style={styles.linhaForm}>
            <TextInput
              style={styles.input}
              value={endereco}
              onChangeText={setEndereco}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.0.10:3333"
              placeholderTextColor={cores.textoSuave}
            />
            <TouchableOpacity style={styles.botaoSecundario} onPress={aplicarEndereco}>
              <Text style={styles.botaoTexto}>Usar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.claroFundo },
  cabecalho: { backgroundColor: cores.primaria, padding: espaco.xl, paddingTop: espaco.xl },
  logo: { color: cores.branco, fontSize: 26, fontWeight: "700" },
  subtitulo: { color: "#CFE9E4", marginTop: espaco.xs, fontSize: 14 },
  conteudo: { flex: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  carregandoTexto: { marginTop: espaco.md, color: cores.textoSuave, fontSize: 13 },
  usuario: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.branco,
    paddingVertical: espaco.md,
    paddingHorizontal: espaco.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  usuarioNome: { flex: 1, marginLeft: espaco.md, fontSize: 16, fontWeight: "600", color: cores.texto },
  entrar: { color: cores.primaria, fontWeight: "600" },
  formulario: {
    backgroundColor: cores.branco,
    padding: espaco.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  linhaForm: { flexDirection: "row", alignItems: "center", gap: espaco.sm },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: 15,
    color: cores.texto,
    backgroundColor: "#F7F9FA",
    marginRight: espaco.sm,
  },
  botao: {
    height: 46,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.primaria,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  botaoSecundario: {
    height: 46,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoDesativado: { opacity: 0.6 },
  botaoTexto: { color: cores.branco, fontWeight: "700" },
  linhaAvancado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: espaco.md,
    marginBottom: espaco.sm,
  },
  avancadoLabel: { color: cores.textoSuave, fontSize: 13 },
  erroCaixa: {
    margin: espaco.lg,
    padding: espaco.md,
    borderRadius: raio.md,
    backgroundColor: "#FFF3F3",
    borderWidth: 1,
    borderColor: "#F2C1C1",
  },
  erroTitulo: { color: cores.erro, fontWeight: "700", marginBottom: espaco.xs },
  erroTexto: { color: cores.texto, fontSize: 13 },
  erroDica: { color: cores.textoSuave, fontSize: 12, marginTop: espaco.sm },
});
