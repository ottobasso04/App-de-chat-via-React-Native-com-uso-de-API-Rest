/**
 * Camada de acesso à API (HTTP / JSON) com autenticação por token.
 * Tudo que fala com o servidor mora aqui — as telas só chamam estas funções.
 */

import Constants from "expo-constants";

export const PORTA_PADRAO = 3333;

/**
 * Descobre o endereço do servidor automaticamente:
 * - No celular (Expo Go) o app conhece o IP do computador que roda o Metro,
 *   e o servidor está nesse mesmo computador.
 * - Na web, usa o host aberto no navegador (normalmente localhost).
 */
function descobrirHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";

  const host = String(hostUri).split(":")[0];
  if (host) return host;

  if (typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }
  return "localhost";
}

let API_URL = `http://${descobrirHost()}:${PORTA_PADRAO}`;

export function getApiUrl() {
  return API_URL;
}

/** Permite trocar o endereço do servidor pela tela de entrada. */
export function setApiUrl(novaUrl) {
  const limpa = String(novaUrl || "").trim().replace(/\/+$/, "");
  if (limpa) API_URL = limpa;
  return API_URL;
}

/* ------------------------- Token da sessão ------------------------- */

// Guardado só em memória: fechou o app, precisa entrar de novo.
let TOKEN = null;

export function getToken() {
  return TOKEN;
}

export function setToken(token) {
  TOKEN = token || null;
}

/** Marca os erros criados por nós, para diferenciar de falhas de rede. */
function marcar(erro, status) {
  erro.daApi = true;
  erro.status = status;
  return erro;
}

/**
 * Wrapper do fetch com timeout, cabeçalhos JSON, token e erros legíveis.
 * Códigos 2xx = sucesso; 401 = não autenticado; 4xx = erro do cliente;
 * 5xx = erro do servidor.
 */
async function requisicao(caminho, opcoes = {}, tempoLimite = 10000) {
  const url = `${API_URL}${caminho}`;
  const metodo = (opcoes.method || "GET").toUpperCase();

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), tempoLimite);

  try {
    const res = await fetch(url, {
      ...opcoes,
      signal: controle.signal,
      headers: {
        "Content-Type": "application/json",
        // O token vai em todas as chamadas depois do login.
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        ...(opcoes.headers || {}),
      },
    });

    const texto = await res.text();

    let dados = null;
    try {
      dados = texto ? JSON.parse(texto) : null;
    } catch (e) {
      throw marcar(new Error(`Resposta inválida (não é JSON) de ${url}`), res.status);
    }

    if (!res.ok) {
      const detalhe = dados?.erro || texto || "sem detalhes";
      // 401: o app trata mostrando a tela de login de novo.
      if (res.status === 401) throw marcar(new Error(detalhe), 401);
      throw marcar(new Error(`${metodo} ${caminho} falhou (${res.status}): ${detalhe}`), res.status);
    }
    return dados;
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(`Tempo esgotado ao chamar ${url}. O servidor está rodando?`);
    }
    if (e.daApi) throw e; // erro que nós mesmos criamos acima

    // Qualquer outra falha aqui é problema de rede/conexão.
    throw new Error(
      `Não consegui falar com ${url}. Verifique se o servidor está rodando e se o celular está na mesma rede do computador.`
    );
  } finally {
    clearTimeout(timer);
  }
}

const json = (corpo) => JSON.stringify(corpo);

/* -------------------------- Autenticação -------------------------- */

export const verificarServidor = () => requisicao("/health", {}, 5000);

/** POST /login — guarda o token e devolve o usuário. */
export async function entrar(usuario, senha) {
  const resposta = await requisicao("/login", {
    method: "POST",
    body: json({ usuario, senha }),
  });
  setToken(resposta.token);
  return resposta.usuario;
}

/** POST /usuarios — cria a conta e já entra logado. */
export async function cadastrar(usuario, senha, nome) {
  const resposta = await requisicao("/usuarios", {
    method: "POST",
    body: json({ usuario, senha, nome }),
  });
  setToken(resposta.token);
  return resposta.usuario;
}

/** POST /logout — invalida o token no servidor e esquece localmente. */
export async function sair() {
  try {
    if (TOKEN) await requisicao("/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

export const meusDados = () => requisicao("/eu");

/* -------------------------- Demais rotas -------------------------- */

export const listarUsuarios = () => requisicao("/usuarios");

/** Troca o nome exibido: atualizarUsuario(1, { nome: "Ana Paula" }) */
export const atualizarUsuario = (id, campos) =>
  requisicao(`/usuarios/${id}`, { method: "PUT", body: json(campos) });

export const listarConversas = () => requisicao("/conversas");

export const criarConversa = (participantes, titulo = null) =>
  requisicao("/conversas", { method: "POST", body: json({ participantes, titulo }) });

export const marcarConversaComoLida = (conversaId) =>
  requisicao(`/conversas/${conversaId}/lida`, { method: "POST" });

export const listarMensagens = (conversaId, depoisDe = 0) =>
  requisicao(`/mensagens?conversaId=${conversaId}&depoisDe=${depoisDe}`);

export const enviarMensagem = (conversaId, texto) =>
  requisicao("/mensagens", { method: "POST", body: json({ conversaId, texto }) });

export const apagarMensagem = (id) => requisicao(`/mensagens/${id}`, { method: "DELETE" });
