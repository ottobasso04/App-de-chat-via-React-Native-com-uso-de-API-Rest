import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";

import Avatar from "../componentes/Avatar";
import Balao from "../componentes/Balao";
import Vazio from "../componentes/Vazio";
import { cores, espaco, raio } from "../tema";
import { alertar, confirmar, nomeDaConversa, corDaConversa, rotuloDoDia } from "../utils";
import { listarMensagens, enviarMensagem, apagarMensagem, marcarConversaComoLida } from "../api";

const INTERVALO_ATUALIZACAO = 2500; // ms
const LIMITE_TEXTO = 1000;

/** Tela de conversa: lista de mensagens + campo de envio. */
export default function TelaChat({ usuarioAtual, conversa, aoVoltar }) {
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [texto, setTexto] = useState("");

  const listaRef = useRef(null);
  const montado = useRef(true);

  const titulo = nomeDaConversa(conversa, usuarioAtual.id);
  const ehGrupo = Boolean(conversa.titulo);

  /** GET /mensagens?conversaId= — e marca como lidas. */
  const buscarMensagens = useCallback(
    async ({ silencioso = false } = {}) => {
      try {
        const dados = await listarMensagens(conversa.id);
        if (!montado.current) return;

        const lista = Array.isArray(dados) ? dados : [];
        setMensagens(lista);
        setErro(null);

        const temNaoLida = lista.some(
          (m) => m.autorId !== usuarioAtual.id && !(m.lidaPor || []).includes(usuarioAtual.id)
        );
        if (temNaoLida) {
          await marcarConversaComoLida(conversa.id);
        }
      } catch (e) {
        if (montado.current && !silencioso) setErro(e.message);
      } finally {
        if (montado.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    [conversa.id, usuarioAtual.id]
  );

  // Carrega ao abrir e fica atualizando enquanto a tela estiver visível.
  useEffect(() => {
    montado.current = true;
    setCarregando(true);
    buscarMensagens();

    const timer = setInterval(() => buscarMensagens({ silencioso: true }), INTERVALO_ATUALIZACAO);
    return () => {
      montado.current = false;
      clearInterval(timer);
    };
  }, [buscarMensagens]);

  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    buscarMensagens();
  }, [buscarMensagens]);

  /** Monta a lista com separadores de data ("Hoje", "Ontem", ...). */
  const itens = useMemo(() => {
    const resultado = [];
    let diaAnterior = null;

    mensagens.forEach((m) => {
      const dia = new Date(m.criadaEm).toDateString();
      if (dia !== diaAnterior) {
        resultado.push({ tipo: "dia", chave: `dia-${dia}`, rotulo: rotuloDoDia(m.criadaEm) });
        diaAnterior = dia;
      }
      resultado.push({ tipo: "mensagem", chave: `msg-${m.id}`, mensagem: m });
    });

    return resultado;
  }, [mensagens]);

  /** POST /mensagens com validação. */
  async function handleEnviar() {
    const limpo = texto.trim();

    if (!limpo) return alertar("Validação", "Digite alguma coisa antes de enviar.");
    if (limpo.length > LIMITE_TEXTO) {
      return alertar("Validação", `A mensagem pode ter no máximo ${LIMITE_TEXTO} caracteres.`);
    }

    try {
      setEnviando(true);
      const nova = await enviarMensagem(conversa.id, limpo);
      setTexto("");
      setMensagens((antigas) => [...antigas, nova]);
      setErro(null);
    } catch (e) {
      alertar("Erro ao enviar", e.message);
    } finally {
      setEnviando(false);
    }
  }

  /** DELETE /mensagens/:id (apenas as próprias). */
  function handleApagar(mensagem) {
    confirmar("Apagar mensagem", `"${mensagem.texto}"`, async () => {
      try {
        await apagarMensagem(mensagem.id);
        setMensagens((antigas) => antigas.filter((m) => m.id !== mensagem.id));
      } catch (e) {
        alertar("Erro ao apagar", e.message);
      }
    }, "Apagar");
  }

  const restantes = LIMITE_TEXTO - texto.length;

  return (
    <KeyboardAvoidingView
      style={styles.tela}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Cabeçalho */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={aoVoltar} style={styles.voltar}>
          <Text style={styles.voltarTexto}>←</Text>
        </TouchableOpacity>
        <Avatar nome={titulo} cor={corDaConversa(conversa, usuarioAtual.id)} tamanho={40} />
        <View style={styles.cabecalhoTextos}>
          <Text style={styles.cabecalhoNome} numberOfLines={1}>
            {titulo}
          </Text>
          <Text style={styles.cabecalhoSub} numberOfLines={1}>
            {ehGrupo
              ? (conversa.participantesDetalhes || []).map((p) => p.nome).join(", ")
              : "conversa individual"}
          </Text>
        </View>
        {(carregando || enviando) && <ActivityIndicator color={cores.branco} />}
      </View>

      {!!erro && (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      )}

      {/* Mensagens */}
      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
        </View>
      ) : (
        <FlatList
          ref={listaRef}
          style={styles.lista}
          contentContainerStyle={styles.listaConteudo}
          data={itens}
          keyExtractor={(item) => item.chave}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={[cores.primaria]} />
          }
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Vazio
              icone="👋"
              titulo="Comece a conversa"
              descricao={`Envie a primeira mensagem para ${titulo}.`}
            />
          }
          renderItem={({ item }) => {
            if (item.tipo === "dia") {
              return (
                <View style={styles.separadorDia}>
                  <Text style={styles.separadorTexto}>{item.rotulo}</Text>
                </View>
              );
            }
            return (
              <Balao
                mensagem={item.mensagem}
                souAutor={item.mensagem.autorId === usuarioAtual.id}
                mostrarAutor={ehGrupo}
                aoPressionarLongo={handleApagar}
              />
            );
          }}
        />
      )}

      {/* Campo de envio */}
      <View style={styles.barraEnvio}>
        <TextInput
          style={styles.input}
          placeholder="Mensagem"
          placeholderTextColor={cores.textoSuave}
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={LIMITE_TEXTO}
          onSubmitEditing={Platform.OS === "web" ? handleEnviar : undefined}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.botaoEnviar, (enviando || !texto.trim()) && styles.botaoDesativado]}
          onPress={handleEnviar}
          disabled={enviando || !texto.trim()}
          activeOpacity={0.8}
        >
          {enviando ? <ActivityIndicator color={cores.branco} /> : <Text style={styles.enviarTexto}>➤</Text>}
        </TouchableOpacity>
      </View>

      {restantes < 100 && (
        <Text style={styles.contador}>{restantes} caractere(s) restante(s)</Text>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.claroFundo },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.primaria,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
  },
  voltar: { paddingHorizontal: espaco.sm, marginRight: espaco.xs },
  voltarTexto: { color: cores.branco, fontSize: 24, lineHeight: 26 },
  cabecalhoTextos: { flex: 1, marginLeft: espaco.md, marginRight: espaco.sm },
  cabecalhoNome: { color: cores.branco, fontSize: 16, fontWeight: "700" },
  cabecalhoSub: { color: "#CFE9E4", fontSize: 12, marginTop: 2 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  lista: { flex: 1 },
  listaConteudo: { paddingVertical: espaco.md, flexGrow: 1 },
  separadorDia: { alignItems: "center", marginVertical: espaco.sm },
  separadorTexto: {
    backgroundColor: "rgba(255,255,255,0.85)",
    color: cores.textoSuave,
    fontSize: 12,
    paddingHorizontal: espaco.md,
    paddingVertical: 4,
    borderRadius: raio.circulo,
    overflow: "hidden",
  },
  barraEnvio: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: espaco.sm,
    backgroundColor: cores.branco,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: raio.lg,
    backgroundColor: "#F4F6F7",
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.md,
    paddingBottom: espaco.md,
    fontSize: 15,
    color: cores.texto,
    marginRight: espaco.sm,
  },
  botaoEnviar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoDesativado: { opacity: 0.5 },
  enviarTexto: { color: cores.branco, fontSize: 18 },
  contador: {
    textAlign: "right",
    paddingHorizontal: espaco.lg,
    paddingBottom: espaco.sm,
    color: cores.textoSuave,
    fontSize: 11,
    backgroundColor: cores.branco,
  },
  erroCaixa: { backgroundColor: "#FFF3F3", padding: espaco.sm },
  erroTexto: { color: cores.erro, fontSize: 12, textAlign: "center" },
});
