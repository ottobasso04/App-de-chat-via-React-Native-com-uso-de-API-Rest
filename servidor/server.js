/**
 * ZapZap — Servidor da API de chat
 * ---------------------------------
 * Servidor HTTP escrito só com módulos nativos do Node (sem npm install).
 * Guarda os dados em `db.json`, na mesma pasta deste arquivo.
 *
 * Rodar:  node server.js        (porta padrão 3333)
 *         PORT=4000 node server.js
 *
 * Endpoints
 *   GET    /health
 *   GET    /usuarios
 *   POST   /usuarios                      { nome }
 *   GET    /conversas?usuarioId=1
 *   POST   /conversas                     { participantes: [1,2], titulo? }
 *   POST   /conversas/:id/lida            { usuarioId }
 *   GET    /mensagens?conversaId=1&depoisDe=0
 *   POST   /mensagens                     { conversaId, autorId, texto }
 *   DELETE /mensagens/:id                 ?usuarioId=1
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORTA = Number(process.env.PORT) || 3333;
const ARQUIVO_DB = path.join(__dirname, "db.json");

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

const CORES = ["#25D366", "#128C7E", "#34B7F1", "#7E57C2", "#EF6C00", "#D81B60", "#00897B", "#5E6BC0"];

function agora() {
  return new Date().toISOString();
}

function bancoInicial() {
  const criadaEm = agora();
  return {
    usuarios: [
      { id: 1, nome: "Ana", cor: CORES[0], criadoEm: criadaEm },
      { id: 2, nome: "Bruno", cor: CORES[1], criadoEm: criadaEm },
      { id: 3, nome: "Carla", cor: CORES[2], criadoEm: criadaEm },
    ],
    conversas: [
      { id: 1, titulo: null, participantes: [1, 2], criadaEm },
      { id: 2, titulo: "Trabalho de SI", participantes: [1, 2, 3], criadaEm },
    ],
    mensagens: [
      { id: 1, conversaId: 1, autorId: 2, texto: "Oi Ana! Tudo bem?", criadaEm, lidaPor: [2] },
      { id: 2, conversaId: 1, autorId: 1, texto: "Tudo ótimo, e você?", criadaEm, lidaPor: [1] },
      { id: 3, conversaId: 2, autorId: 3, texto: "Pessoal, entregamos o app na sexta.", criadaEm, lidaPor: [3] },
    ],
  };
}

let db;

function carregarBanco() {
  try {
    if (fs.existsSync(ARQUIVO_DB)) {
      db = JSON.parse(fs.readFileSync(ARQUIVO_DB, "utf8"));
      // Garante que todas as coleções existem, mesmo em um db.json antigo.
      db.usuarios = db.usuarios || [];
      db.conversas = db.conversas || [];
      db.mensagens = db.mensagens || [];
    } else {
      db = bancoInicial();
      salvarBanco();
    }
  } catch (erro) {
    console.error("Não consegui ler db.json, recriando do zero:", erro.message);
    db = bancoInicial();
    salvarBanco();
  }
}

function salvarBanco() {
  fs.writeFileSync(ARQUIVO_DB, JSON.stringify(db, null, 2), "utf8");
}

function proximoId(colecao) {
  return colecao.reduce((maior, item) => Math.max(maior, Number(item.id) || 0), 0) + 1;
}

/* ------------------------------------------------------------------ */
/* Helpers HTTP                                                        */
/* ------------------------------------------------------------------ */

function responder(res, status, corpo) {
  const texto = corpo === undefined ? "" : JSON.stringify(corpo);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  res.end(texto);
}

function erro(res, status, mensagem) {
  responder(res, status, { erro: mensagem });
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = "";
    req.on("data", (pedaco) => {
      dados += pedaco;
      if (dados.length > 1e6) {
        reject(new Error("Corpo da requisição grande demais"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!dados) return resolve({});
      try {
        resolve(JSON.parse(dados));
      } catch (e) {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

/* ------------------------------------------------------------------ */
/* Regras de negócio                                                   */
/* ------------------------------------------------------------------ */

function acharUsuario(id) {
  return db.usuarios.find((u) => u.id === Number(id));
}

function acharConversa(id) {
  return db.conversas.find((c) => c.id === Number(id));
}

function mensagensDaConversa(conversaId) {
  return db.mensagens
    .filter((m) => m.conversaId === Number(conversaId))
    .sort((a, b) => a.id - b.id);
}

/** Monta a conversa "enriquecida" para a tela de lista. */
function montarConversa(conversa, usuarioId) {
  const mensagens = mensagensDaConversa(conversa.id);
  const ultima = mensagens[mensagens.length - 1] || null;
  const naoLidas = mensagens.filter(
    (m) => m.autorId !== Number(usuarioId) && !(m.lidaPor || []).includes(Number(usuarioId))
  ).length;

  return {
    ...conversa,
    participantesDetalhes: conversa.participantes
      .map((id) => acharUsuario(id))
      .filter(Boolean)
      .map(({ id, nome, cor }) => ({ id, nome, cor })),
    ultimaMensagem: ultima,
    naoLidas,
    atualizadaEm: ultima ? ultima.criadaEm : conversa.criadaEm,
  };
}

/* ------------------------------------------------------------------ */
/* Rotas                                                               */
/* ------------------------------------------------------------------ */

async function rotear(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const caminho = url.pathname.replace(/\/+$/, "") || "/";
  const metodo = req.method.toUpperCase();
  const query = url.searchParams;

  console.log(`${metodo} ${url.pathname}${url.search}`);

  if (metodo === "OPTIONS") return responder(res, 204);

  /* ---------------- health ---------------- */
  if (metodo === "GET" && (caminho === "/" || caminho === "/health")) {
    return responder(res, 200, {
      ok: true,
      servidor: "ZapZap API",
      versao: "1.0.0",
      hora: agora(),
      totais: {
        usuarios: db.usuarios.length,
        conversas: db.conversas.length,
        mensagens: db.mensagens.length,
      },
    });
  }

  /* ---------------- usuários ---------------- */
  if (metodo === "GET" && caminho === "/usuarios") {
    return responder(res, 200, db.usuarios);
  }

  if (metodo === "POST" && caminho === "/usuarios") {
    const corpo = await lerCorpo(req);
    const nome = String(corpo.nome || "").trim();

    if (nome.length < 2) return erro(res, 400, "O nome precisa ter pelo menos 2 caracteres.");
    if (nome.length > 30) return erro(res, 400, "O nome pode ter no máximo 30 caracteres.");
    if (db.usuarios.some((u) => u.nome.toLowerCase() === nome.toLowerCase())) {
      return erro(res, 409, `Já existe um usuário chamado "${nome}".`);
    }

    const id = proximoId(db.usuarios);
    const usuario = {
      id,
      nome,
      cor: CORES[(id - 1) % CORES.length],
      criadoEm: agora(),
    };
    db.usuarios.push(usuario);
    salvarBanco();
    return responder(res, 201, usuario);
  }

  /* ---------------- conversas ---------------- */
  if (metodo === "GET" && caminho === "/conversas") {
    const usuarioId = Number(query.get("usuarioId"));
    if (!usuarioId) return erro(res, 400, "Informe ?usuarioId=");
    if (!acharUsuario(usuarioId)) return erro(res, 404, "Usuário não encontrado.");

    const lista = db.conversas
      .filter((c) => c.participantes.includes(usuarioId))
      .map((c) => montarConversa(c, usuarioId))
      .sort((a, b) => new Date(b.atualizadaEm) - new Date(a.atualizadaEm));

    return responder(res, 200, lista);
  }

  if (metodo === "POST" && caminho === "/conversas") {
    const corpo = await lerCorpo(req);
    const participantes = Array.isArray(corpo.participantes)
      ? [...new Set(corpo.participantes.map(Number))]
      : [];
    const titulo = corpo.titulo ? String(corpo.titulo).trim() : null;

    if (participantes.length < 2) return erro(res, 400, "Uma conversa precisa de pelo menos 2 participantes.");
    const inexistente = participantes.find((id) => !acharUsuario(id));
    if (inexistente) return erro(res, 404, `Usuário ${inexistente} não existe.`);

    // Conversa individual já existente? Reaproveita em vez de duplicar.
    if (participantes.length === 2) {
      const existente = db.conversas.find(
        (c) =>
          c.participantes.length === 2 &&
          participantes.every((id) => c.participantes.includes(id))
      );
      if (existente) return responder(res, 200, montarConversa(existente, participantes[0]));
    }

    const conversa = {
      id: proximoId(db.conversas),
      titulo: participantes.length > 2 ? titulo || "Novo grupo" : null,
      participantes,
      criadaEm: agora(),
    };
    db.conversas.push(conversa);
    salvarBanco();
    return responder(res, 201, montarConversa(conversa, participantes[0]));
  }

  // POST /conversas/:id/lida
  const casaLida = caminho.match(/^\/conversas\/(\d+)\/lida$/);
  if (metodo === "POST" && casaLida) {
    const conversa = acharConversa(casaLida[1]);
    if (!conversa) return erro(res, 404, "Conversa não encontrada.");

    const corpo = await lerCorpo(req);
    const usuarioId = Number(corpo.usuarioId);
    if (!acharUsuario(usuarioId)) return erro(res, 404, "Usuário não encontrado.");

    let alteradas = 0;
    db.mensagens.forEach((m) => {
      if (m.conversaId === conversa.id) {
        m.lidaPor = m.lidaPor || [];
        if (!m.lidaPor.includes(usuarioId)) {
          m.lidaPor.push(usuarioId);
          alteradas++;
        }
      }
    });
    if (alteradas) salvarBanco();
    return responder(res, 200, { ok: true, marcadas: alteradas });
  }

  /* ---------------- mensagens ---------------- */
  if (metodo === "GET" && caminho === "/mensagens") {
    const conversaId = Number(query.get("conversaId"));
    const depoisDe = Number(query.get("depoisDe")) || 0;
    if (!conversaId) return erro(res, 400, "Informe ?conversaId=");
    if (!acharConversa(conversaId)) return erro(res, 404, "Conversa não encontrada.");

    const lista = mensagensDaConversa(conversaId)
      .filter((m) => m.id > depoisDe)
      .map((m) => ({ ...m, autor: acharUsuario(m.autorId) || null }));

    return responder(res, 200, lista);
  }

  if (metodo === "POST" && caminho === "/mensagens") {
    const corpo = await lerCorpo(req);
    const conversaId = Number(corpo.conversaId);
    const autorId = Number(corpo.autorId);
    const texto = String(corpo.texto || "").trim();

    const conversa = acharConversa(conversaId);
    if (!conversa) return erro(res, 404, "Conversa não encontrada.");
    if (!acharUsuario(autorId)) return erro(res, 404, "Autor não encontrado.");
    if (!conversa.participantes.includes(autorId)) {
      return erro(res, 403, "Este usuário não participa da conversa.");
    }
    if (!texto) return erro(res, 400, "A mensagem não pode ser vazia.");
    if (texto.length > 1000) return erro(res, 400, "A mensagem pode ter no máximo 1000 caracteres.");

    const mensagem = {
      id: proximoId(db.mensagens),
      conversaId,
      autorId,
      texto,
      criadaEm: agora(),
      lidaPor: [autorId], // quem escreveu já leu
    };
    db.mensagens.push(mensagem);
    salvarBanco();
    return responder(res, 201, { ...mensagem, autor: acharUsuario(autorId) });
  }

  // DELETE /mensagens/:id?usuarioId=1
  const casaMensagem = caminho.match(/^\/mensagens\/(\d+)$/);
  if (metodo === "DELETE" && casaMensagem) {
    const id = Number(casaMensagem[1]);
    const indice = db.mensagens.findIndex((m) => m.id === id);
    if (indice === -1) return erro(res, 404, "Mensagem não encontrada.");

    const usuarioId = Number(query.get("usuarioId"));
    if (usuarioId && db.mensagens[indice].autorId !== usuarioId) {
      return erro(res, 403, "Você só pode apagar as suas próprias mensagens.");
    }

    db.mensagens.splice(indice, 1);
    salvarBanco();
    return responder(res, 200, { ok: true, id });
  }

  return erro(res, 404, `Rota não encontrada: ${metodo} ${caminho}`);
}

/* ------------------------------------------------------------------ */
/* Sobe o servidor                                                     */
/* ------------------------------------------------------------------ */

carregarBanco();

const servidor = http.createServer((req, res) => {
  rotear(req, res).catch((e) => {
    console.error("Erro:", e.message);
    erro(res, 500, e.message || "Erro interno do servidor");
  });
});

function ipsDaRede() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  Object.values(interfaces).forEach((lista) => {
    (lista || []).forEach((info) => {
      if (info.family === "IPv4" && !info.internal) ips.push(info.address);
    });
  });
  return ips;
}

servidor.listen(PORTA, "0.0.0.0", () => {
  console.log("\n  ZapZap API no ar 🚀");
  console.log(`  Local:  http://localhost:${PORTA}`);
  ipsDaRede().forEach((ip) => console.log(`  Rede:   http://${ip}:${PORTA}   <- use este no celular`));
  console.log(`  Banco:  ${ARQUIVO_DB}\n`);
});
