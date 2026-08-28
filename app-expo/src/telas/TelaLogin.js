import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { cores, espaco, raio } from "../tema";
import { alertar } from "../utils";
import { entrar, cadastrar, verificarServidor, getApiUrl, setApiUrl } from "../api";

/**
 * Tela de entrada: login com usuário e senha, ou criação de conta.
 * O token devolvido pelo servidor é guardado dentro de api.js e vai
 * automaticamente em todas as chamadas seguintes.
 */
export default function TelaLogin({ aoEntrar }) {
  const [modo, setModo] = useState("login"); // login | cadastro

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [nome, setNome] = useState("");

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [servidorOk, setServidorOk] = useState(null); // null = checando
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const [endereco, setEndereco] = useState(getApiUrl());

  /** Confere se a API responde, para avisar antes de o usuário digitar tudo. */
  const checarServidor = useCallback(async () => {
    try {
      setServidorOk(null);
      await verificarServidor();
      setServidorOk(true);
    } catch (e) {
      setServidorOk(false);
    }
  }, []);

  useEffect(() => {
    checarServidor();
  }, [checarServidor]);

  function limpar() {
    setSenha("");
    setConfirmarSenha("");
  }

  /** Valida o formulário e chama /login ou /usuarios. */
  async function handleEnviar() {
    const login = usuario.trim().toLowerCase();

    if (!login) return alertar("Validação", "Informe o seu usuário.");
    if (!senha) return alertar("Validação", "Informe a sua senha.");

    if (modo === "cadastro") {
      if (login.length < 3) return alertar("Validação", "O usuário precisa ter pelo menos 3 caracteres.");
      if (!/^[a-z0-9._]+$/.test(login)) {
        return alertar("Validação", "O usuário aceita apenas letras, números, ponto e underline — sem espaços.");
      }
      if (senha.length < 6) return alertar("Validação", "A senha precisa ter pelo menos 6 caracteres.");
      if (senha !== confirmarSenha) return alertar("Validação", "As senhas não são iguais.");
      if (nome.trim().length < 2) return alertar("Validação", "Informe o nome que aparecerá nas conversas.");
    }

    try {
      setEnviando(true);
      const conta =
        modo === "login"
          ? await entrar(login, senha)
          : await cadastrar(login, senha, nome.trim());

      limpar();
      aoEntrar(conta);
    } catch (e) {
      alertar(modo === "login" ? "Não foi possível entrar" : "Não foi possível criar a conta", e.message);
    } finally {
      setEnviando(false);
    }
  }

  function aplicarEndereco() {
    setEndereco(setApiUrl(endereco));
    checarServidor();
  }

  const ehCadastro = modo === "cadastro";

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.topo}>
          <Text style={styles.logo}>ZapZap</Text>
          <Text style={styles.subtitulo}>
            {ehCadastro ? "Crie sua conta para começar" : "Entre com seu usuário e senha"}
          </Text>
        </View>

        <View style={styles.cartao}>
          {/* Estado do servidor */}
          {servidorOk === false && (
            <View style={styles.erroCaixa}>
              <Text style={styles.erroTitulo}>Servidor fora do ar</Text>
              <Text style={styles.erroTexto}>
                Não consegui falar com {getApiUrl()}. Rode `node server.js` na pasta servidor/.
              </Text>
              <TouchableOpacity onPress={checarServidor}>
                <Text style={styles.tentarNovamente}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.rotulo}>Usuário</Text>
          <TextInput
            style={styles.input}
            value={usuario}
            onChangeText={setUsuario}
            placeholder="ana"
            placeholderTextColor={cores.textoSuave}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />

          {ehCadastro && (
            <>
              <Text style={styles.rotulo}>Nome exibido</Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Como você aparece nas conversas"
                placeholderTextColor={cores.textoSuave}
                maxLength={30}
              />
            </>
          )}

          <Text style={styles.rotulo}>Senha</Text>
          <TextInput
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
            placeholder="Mínimo de 6 caracteres"
            placeholderTextColor={cores.textoSuave}
            secureTextEntry={!mostrarSenha}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={64}
            onSubmitEditing={ehCadastro ? undefined : handleEnviar}
          />

          {ehCadastro && (
            <>
              <Text style={styles.rotulo}>Confirmar senha</Text>
              <TextInput
                style={styles.input}
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                placeholder="Repita a senha"
                placeholderTextColor={cores.textoSuave}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={64}
                onSubmitEditing={handleEnviar}
              />
            </>
          )}

          <View style={styles.linhaSwitch}>
            <Text style={styles.switchLabel}>Mostrar senha</Text>
            <Switch
              value={mostrarSenha}
              onValueChange={setMostrarSenha}
              trackColor={{ true: cores.destaque, false: "#CFD8DC" }}
            />
          </View>

          <TouchableOpacity
            style={[styles.botao, enviando && styles.botaoDesativado]}
            onPress={handleEnviar}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color={cores.branco} />
            ) : (
              <Text style={styles.botaoTexto}>{ehCadastro ? "Criar conta e entrar" : "Entrar"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.alternar}
            onPress={() => {
              setModo(ehCadastro ? "login" : "cadastro");
              limpar();
            }}
          >
            <Text style={styles.alternarTexto}>
              {ehCadastro ? "Já tenho conta — entrar" : "Não tenho conta — criar agora"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Configuração do servidor */}
        <View style={styles.avancado}>
          <View style={styles.linhaSwitch}>
            <Text style={styles.switchLabel}>Configurar servidor</Text>
            <Switch
              value={mostrarAvancado}
              onValueChange={setMostrarAvancado}
              trackColor={{ true: cores.destaque, false: "#CFD8DC" }}
            />
          </View>

          {mostrarAvancado && (
            <View style={styles.linhaEndereco}>
              <TextInput
                style={[styles.input, styles.inputEndereco]}
                value={endereco}
                onChangeText={setEndereco}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://192.168.0.10:3333"
                placeholderTextColor={cores.textoSuave}
              />
              <TouchableOpacity style={styles.botaoUsar} onPress={aplicarEndereco}>
                <Text style={styles.botaoTexto}>Usar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.dica}>Contas de exemplo: ana, bruno ou carla — senha 123456</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.primaria },
  conteudo: { flexGrow: 1, justifyContent: "center", padding: espaco.lg },

  topo: { alignItems: "center", marginBottom: espaco.xl },
  logo: { color: cores.branco, fontSize: 34, fontWeight: "700" },
  subtitulo: { color: "#CFE9E4", marginTop: espaco.xs, fontSize: 14 },

  cartao: {
    backgroundColor: cores.branco,
    borderRadius: raio.lg,
    padding: espaco.lg,
  },
  rotulo: {
    marginTop: espaco.md,
    marginBottom: espaco.xs,
    fontSize: 12,
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
  linhaSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: espaco.md,
  },
  switchLabel: { color: cores.textoSuave, fontSize: 13 },

  botao: {
    marginTop: espaco.lg,
    height: 50,
    borderRadius: raio.md,
    backgroundColor: cores.primaria,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoDesativado: { opacity: 0.6 },
  botaoTexto: { color: cores.branco, fontWeight: "700", fontSize: 15 },

  alternar: { marginTop: espaco.md, alignItems: "center" },
  alternarTexto: { color: cores.primaria, fontWeight: "600", fontSize: 13 },

  avancado: { marginTop: espaco.lg, paddingHorizontal: espaco.xs },
  linhaEndereco: { flexDirection: "row", alignItems: "center", marginTop: espaco.sm },
  inputEndereco: { flex: 1, marginRight: espaco.sm, backgroundColor: cores.branco },
  botaoUsar: {
    height: 46,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
  },

  dica: {
    marginTop: espaco.lg,
    textAlign: "center",
    color: "#CFE9E4",
    fontSize: 12,
  },

  erroCaixa: {
    padding: espaco.md,
    borderRadius: raio.md,
    backgroundColor: "#FFF3F3",
    borderWidth: 1,
    borderColor: "#F2C1C1",
  },
  erroTitulo: { color: cores.erro, fontWeight: "700", marginBottom: espaco.xs },
  erroTexto: { color: cores.texto, fontSize: 12 },
  tentarNovamente: { color: cores.primaria, fontWeight: "700", fontSize: 13, marginTop: espaco.sm },
});
