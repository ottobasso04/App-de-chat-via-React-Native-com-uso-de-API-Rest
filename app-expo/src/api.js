/**
 * Camada de acesso à API (HTTP / JSON).
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

/** Marca os erros criados por nós, para diferenciar de falhas de rede. */
function marcar(erro) {
  erro.daApi = true;
  return erro;
}

/**
 * Wrapper do fetch com timeout, cabeçalhos JSON e erros legíveis.
 * Códigos 2xx = sucesso; 4xx = erro do cliente; 5xx = erro do servidor.
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
      headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) },
    });

    const texto = await res.text();

    let dados = null;
    try {
      dados = texto ? JSON.parse(texto) : null;
    } catch (e) {
      throw marcar(new Error(`Resposta inválida (não é JSON) de ${url}`));
    }

    if (!res.ok) {
      const detalhe = dados?.erro || texto || "sem detalhes";
      throw marcar(new Error(`${metodo} ${caminho} falhou (${res.status}): ${detalhe}`));
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

/* -------------------------- Endpoints -------------------------- */

export const verificarServidor = () => requisicao("/health", {}, 5000);

export const listarUsuarios = () => requisicao("/usuarios");

export const criarUsuario = (nome) =>
  requisicao("/usuarios", { method: "POST", body: json({ nome }) });

export const listarConversas = (usuarioId) =>
  requisicao(`/conversas?usuarioId=${usuarioId}`);

export const criarConversa = (participantes, titulo = null) =>
  requisicao("/conversas", { method: "POST", body: json({ participantes, titulo }) });

export const marcarConversaComoLida = (conversaId, usuarioId) =>
  requisicao(`/conversas/${conversaId}/lida`, { method: "POST", body: json({ usuarioId }) });

export const listarMensagens = (conversaId, depoisDe = 0) =>
  requisicao(`/mensagens?conversaId=${conversaId}&depoisDe=${depoisDe}`);

export const enviarMensagem = (conversaId, autorId, texto) =>
  requisicao("/mensagens", { method: "POST", body: json({ conversaId, autorId, texto }) });

export const apagarMensagem = (id, usuarioId) =>
  requisicao(`/mensagens/${id}?usuarioId=${usuarioId}`, { method: "DELETE" });
