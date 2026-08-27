import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Switch,
  StyleSheet,
} from "react-native";

import Avatar from "../componentes/Avatar";
import ItemConversa from "../componentes/ItemConversa";
import Vazio from "../componentes/Vazio";
import { cores, espaco, raio } from "../tema";
import { alertar, nomeDaConversa } from "../utils";
import { listarConversas } from "../api";

const INTERVALO_ATUALIZACAO = 4000; // ms — "tempo real" simples por polling

/** Lista de conversas do usuário logado (estilo WhatsApp). */
export default function TelaConversas({ usuarioAtual, aoAbrirConversa, aoNovaConversa, aoSair }) {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(null);

  const [busca, setBusca] = useState("");
  const [soNaoLidas, setSoNaoLidas] = useState(false);

  const montado = useRef(true);

  /** GET /conversas?usuarioId= */
  const buscarConversas = useCallback(
    async ({ silencioso = false } = {}) => {
      try {
        if (!silencioso) setErro(null);
        const dados = await listarConversas(usuarioAtual.id);
        if (!montado.current) return;
        setConversas(Array.isArray(dados) ? dados : []);
        setErro(null);
      } catch (e) {
        if (!montado.current) return;
        if (!silencioso) setErro(e.message);
      } finally {
        if (montado.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    [usuarioAtual.id]
  );

  // Busca inicial + atualização automática enquanto a tela estiver aberta.
  useEffect(() => {
    montado.current = true;
    setCarregando(true);
    buscarConversas();

    const timer = setInterval(() => buscarConversas({ silencioso: true }), INTERVALO_ATUALIZACAO);

    return () => {
      montado.current = false;
      clearInterval(timer);
    };
  }, [buscarConversas]);

  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    buscarConversas();
  }, [buscarConversas]);

  /** Filtro de busca + filtro de não lidas, recalculado só quando precisa. */
  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return conversas.filter((c) => {
      if (soNaoLidas && !c.naoLidas) return false;
      if (!termo) return true;
      const nome = nomeDaConversa(c, usuarioAtual.id).toLowerCase();
      const ultima = (c.ultimaMensagem?.texto || "").toLowerCase();
      return nome.includes(termo) || ultima.includes(termo);
    });
  }, [conversas, busca, soNaoLidas, usuarioAtual.id]);

  const totalNaoLidas = conversas.reduce((soma, c) => soma + (c.naoLidas || 0), 0);

  return (
    <View style={styles.tela}>
      {/* Cabeçalho */}
      <View style={styles.cabecalho}>
        <Avatar nome={usuarioAtual.nome} cor={usuarioAtual.cor} tamanho={40} />
        <View style={styles.cabecalhoTextos}>
          <Text style={styles.cabecalhoNome}>{usuarioAtual.nome}</Text>
          <Text style={styles.cabecalhoSub}>
            {totalNaoLidas > 0 ? `${totalNaoLidas} mensagem(ns) não lida(s)` : "Tudo em dia"}
          </Text>
        </View>
        <TouchableOpacity onPress={aoSair} style={styles.sair}>
          <Text style={styles.sairTexto}>Trocar</Text>
        </TouchableOpacity>
      </View>

      {/* Busca e filtro */}
      <View style={styles.barraFiltros}>
        <TextInput
          style={styles.busca}
          placeholder="Buscar conversa ou mensagem"
          placeholderTextColor={cores.textoSuave}
          value={busca}
          onChangeText={setBusca}
        />
        <View style={styles.filtroNaoLidas}>
          <Text style={styles.filtroLabel}>Não lidas</Text>
          <Switch
            value={soNaoLidas}
            onValueChange={setSoNaoLidas}
            trackColor={{ true: cores.destaque, false: "#CFD8DC" }}
          />
        </View>
      </View>

      {/* Lista */}
      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
        </View>
      ) : (
        <FlatList
          data={conversasFiltradas}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={[cores.primaria]} />
          }
          ListHeaderComponent={
            erro ? (
              <View style={styles.erroCaixa}>
                <Text style={styles.erroTexto}>{erro}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Vazio
              icone="💬"
              titulo={busca || soNaoLidas ? "Nada encontrado" : "Nenhuma conversa por aqui"}
              descricao={
                busca || soNaoLidas
                  ? "Tente outro termo ou desligue o filtro de não lidas."
                  : "Toque no botão + para começar a conversar com alguém."
              }
            />
          }
          renderItem={({ item }) => (
            <ItemConversa conversa={item} usuarioAtual={usuarioAtual} aoAbrir={aoAbrirConversa} />
          )}
        />
      )}

      {/* Botão flutuante de nova conversa */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (erro) return alertar("Sem conexão", "Conecte-se ao servidor antes de criar uma conversa.");
          aoNovaConversa();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.branco },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.primaria,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
  },
  cabecalhoTextos: { flex: 1, marginLeft: espaco.md },
  cabecalhoNome: { color: cores.branco, fontSize: 17, fontWeight: "700" },
  cabecalhoSub: { color: "#CFE9E4", fontSize: 12, marginTop: 2 },
  sair: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  sairTexto: { color: cores.branco, fontWeight: "600", fontSize: 13 },
  barraFiltros: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    backgroundColor: "#F4F6F7",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  busca: {
    flex: 1,
    height: 40,
    borderRadius: raio.circulo,
    paddingHorizontal: espaco.lg,
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.borda,
    color: cores.texto,
  },
  filtroNaoLidas: { flexDirection: "row", alignItems: "center", marginLeft: espaco.md },
  filtroLabel: { color: cores.textoSuave, fontSize: 12, marginRight: espaco.xs },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  erroCaixa: { backgroundColor: "#FFF3F3", padding: espaco.md },
  erroTexto: { color: cores.erro, fontSize: 13 },
  fab: {
    position: "absolute",
    right: espaco.lg,
    bottom: espaco.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabTexto: { color: cores.branco, fontSize: 30, lineHeight: 34, fontWeight: "300" },
});
