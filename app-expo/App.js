/**
 * ZapZap — app de chat em React Native (Expo)
 * -------------------------------------------
 * Navegação simples por estado (sem bibliotecas extras):
 *   login -> conversas -> chat / nova conversa
 *
 * Conceitos praticados: useState, useEffect, useCallback, FlatList,
 * RefreshControl, ActivityIndicator, KeyboardAvoidingView, consumo de
 * API REST com GET/POST/DELETE e JSON.
 */

import React, { useState, useCallback } from "react";
import { SafeAreaView, StatusBar, Platform, StyleSheet, View } from "react-native";

import TelaLogin from "./src/telas/TelaLogin";
import TelaConversas from "./src/telas/TelaConversas";
import TelaChat from "./src/telas/TelaChat";
import TelaNovaConversa from "./src/telas/TelaNovaConversa";
import TelaPerfil from "./src/telas/TelaPerfil";
import { sair as encerrarSessao } from "./src/api";
import { cores } from "./src/tema";

export default function App() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [tela, setTela] = useState("login"); // login | conversas | chat | nova | perfil | nova
  const [conversaAtiva, setConversaAtiva] = useState(null);

  const entrar = useCallback((usuario) => {
    setUsuarioAtual(usuario);
    setTela("conversas");
  }, []);

  /** Encerra a sessão no servidor e volta para a tela de login. */
  const sair = useCallback(async () => {
    try {
      await encerrarSessao();
    } finally {
      setUsuarioAtual(null);
      setConversaAtiva(null);
      setTela("login");
    }
  }, []);

  const abrirConversa = useCallback((conversa) => {
    setConversaAtiva(conversa);
    setTela("chat");
  }, []);

  const voltarParaConversas = useCallback(() => {
    setConversaAtiva(null);
    setTela("conversas");
  }, []);

  /** Recebe o usuário já atualizado pelo servidor (nome ou cor). */
  const atualizarPerfil = useCallback((usuarioAtualizado) => {
    setUsuarioAtual(usuarioAtualizado);
  }, []);

  function renderizarTela() {
    if (!usuarioAtual || tela === "login") {
      return <TelaLogin aoEntrar={entrar} />;
    }

    if (tela === "perfil") {
      return (
        <TelaPerfil
          usuarioAtual={usuarioAtual}
          aoVoltar={voltarParaConversas}
          aoSalvar={atualizarPerfil}
        />
      );
    }

    if (tela === "nova") {
      return (
        <TelaNovaConversa
          usuarioAtual={usuarioAtual}
          aoVoltar={voltarParaConversas}
          aoCriar={abrirConversa}
        />
      );
    }

    if (tela === "chat" && conversaAtiva) {
      return (
        <TelaChat
          usuarioAtual={usuarioAtual}
          conversa={conversaAtiva}
          aoVoltar={voltarParaConversas}
        />
      );
    }

    return (
      <TelaConversas
        usuarioAtual={usuarioAtual}
        aoAbrirConversa={abrirConversa}
        aoNovaConversa={() => setTela("nova")}
        aoAbrirPerfil={() => setTela("perfil")}
        aoSair={sair}
      />
    );
  }

  return (
    <SafeAreaView style={styles.raiz}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primariaEscura} />
      <View style={styles.conteudo}>{renderizarTela()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: cores.primaria,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  conteudo: { flex: 1, backgroundColor: cores.claroFundo },
});
