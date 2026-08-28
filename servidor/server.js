/**
 * ZapZap — Servidor da API de chat (com autenticação)
 * ---------------------------------------------------
 * Servidor HTTP escrito só com módulos nativos do Node (sem npm install).
 * Guarda os dados em `db.json`, na mesma pasta deste arquivo.
 *
 * Rodar:  node server.js        (porta padrão 3333)
 *         PORT=4000 node server.js
 *
 * Contas de exemplo criadas na primeira execução:
 *   ana / 123456     bruno / 123456     carla / 123456
 *
 * Rotas públicas
 *   GET    /health
 *   POST   /usuarios                      { usuario, senha, nome? }   cadastro
 *   POST   /login                         { usuario, senha }
 *
 * Rotas protegidas (exigem cabeçalho Authorization: Bearer <token>)
 *   POST   /logout
 *   GET    /eu
 *   GET    /usuarios
 *   PUT    /usuarios/:id                  { nome }                    trocar o nome
 *   GET    /conversas
 *   POST   /conversas                     { participantes, titulo? }
 *   POST   /conversas/:id/lida
 *   GET    /mensagens?conversaId=1
 *   POST   /mensagens                     { conversaId, texto }
 *   DELETE /mensagens/:id
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const PORTA = Number(process.env.PORT) || 3333;

// DB_PATH permite guardar o banco fora da pasta do projeto
// (usado pelo Docker, que monta um volume em /dados).
const ARQUIVO_DB = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, "db.json");

/* ------------------------------------------------------------------ */
/* Senhas                                                              */
/* ------------------------------------------------------------------ */

/**
 * A senha NUNCA é gravada como texto. Guardamos o resultado do scrypt
 * (função lenta, feita para senhas) junto de um "sal" aleatório — assim
 * duas pessoas com a mesma senha têm hashes diferentes, e quem abrir o
 * db.json não consegue ler as senhas.
 */
function gerarHashSenha(senha, sal = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(senha), sal, 64).toString("hex");
  return { sal, hash };
}

/** Comparação em tempo constante, para não vazar informação pelo tempo de resposta. */
function senhaConfere(senha, usuario) {
  if (!usuario?.senhaHash || !usuario?.sal) return false;
  const { hash } = gerarHashSenha(senha, usuario.sal);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(usuario.senhaHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function gerarToken() {
  return crypto.randomBytes(24).toString("hex");
}

/** Versão do usuário que pode ser enviada ao app: sem hash, sem sal. */
function publico(usuario) {
  if (!usuario) return null;
  const { senhaHash, sal, ...resto } = usuario;
  return resto;
}

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

const CORES = ["#25D366", "#128C7E", "#34B7F1", "#7E57C2", "#EF6C00", "#D81B60", "#00897B", "#5E6BC0"];

function agora() {
  return new Date().toISOString();
}

function bancoInicial() {
  const criadaEm = agora();

  const criar = (id, usuario, nome, senha) => {
    const { sal, hash } = gerarHashSenha(senha);
    return {
      id,
      usuario, // login (único, sem espaços)
      nome, // nome exibido (pode ser trocado)
      cor: CORES[(id - 1) % CORES.length],
      senhaHash: hash,
      sal,
      criadoEm: criadaEm,
    };
  };

  return {
    usuarios: [
      criar(1, "ana", "Ana", "123456"),
      criar(2, "bruno", "Bruno", "123456"),
      criar(3, "carla", "Carla", "123456"),
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
    sessoes: [],
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
      db.sessoes = db.sessoes || [];
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
  const pasta = path.dirname(ARQUIVO_DB);
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
        const e = new Error("Corpo da requisição grande demais.");
        e.status = 413;
        reject(e);
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!dados) return resolve({});
      try {
        resolve(JSON.parse(dados));
      } catch (e) {
        const erroJson = new Error("JSON inválido no corpo da requisição.");
        erroJson.status = 400;
        reject(erroJson);
      }
    });
    req.on("error", reject);
  });
}

/* ------------------------------------------------------------------ */
/* Sessões                                                             */
/* ------------------------------------------------------------------ */

/** Lê o "Authorization: Bearer <token>" e devolve o usuário dono da sessão. */
function usuarioDaRequisicao(req) {
  const cabecalho = req.headers.authorization || "";
  const casa = cabecalho.match(/^Bearer\s+(.+)$/i);
  if (!casa) return null;

  const sessao = db.sessoes.find((s) => s.token === casa[1]);
  if (!sessao) return null;

  return acharUsuario(sessao.usuarioId) || null;
}

/* ------------------------------------------------------------------ */
/* Regras de negócio                                                   */
/* ------------------------------------------------------------------ */

function acharUsuario(id) {
  return db.usuarios.find((u) => u.id === Number(id));
}

function acharPorLogin(login) {
  const alvo = String(login || "").trim().toLowerCase();
  return db.usuarios.find((u) => u.usuario.toLowerCase() === alvo);
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
/* Validações de cadastro                                              */
/* ------------------------------------------------------------------ */

function validarLogin(login) {
  const valor = String(login || "").trim().toLowerCase();
  if (valor.length < 3) return "O usuário precisa ter pelo menos 3 caracteres.";
  if (valor.length > 20) return "O usuário pode ter no máximo 20 caracteres.";
  if (!/^[a-z0-9._]+$/.test(valor)) {
    return "O usuário pode ter apenas letras, números, ponto e underline (sem espaços).";
  }
  return null;
}

function validarSenha(senha) {
  const valor = String(senha || "");
  if (valor.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
  if (valor.length > 64) return "A senha pode ter no máximo 64 caracteres.";
  return null;
}

function validarNome(nome) {
  const valor = String(nome || "").trim();
  if (valor.length < 2) return "O nome precisa ter pelo menos 2 caracteres.";
  if (valor.length > 30) return "O nome pode ter no máximo 30 caracteres.";
  return null;
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

  /* =================== ROTAS PÚBLICAS =================== */

  if (metodo === "GET" && (caminho === "/" || caminho === "/health")) {
    return responder(res, 200, {
      ok: true,
      servidor: "ZapZap API",
      versao: "2.0.0",
      hora: agora(),
      totais: {
        usuarios: db.usuarios.length,
        conversas: db.conversas.length,
        mensagens: db.mensagens.length,
        sessoesAtivas: db.sessoes.length,
      },
    });
  }

  // Cadastro
  if (metodo === "POST" && caminho === "/usuarios") {
    const corpo = await lerCorpo(req);

    const login = String(corpo.usuario || "").trim().toLowerCase();
    const senha = String(corpo.senha || "");
    const nome = String(corpo.nome || corpo.usuario || "").trim();

    const problema = validarLogin(login) || validarSenha(senha) || validarNome(nome);
    if (problema) return erro(res, 400, problema);

    if (acharPorLogin(login)) {
      return erro(res, 409, `O usuário "${login}" já está em uso. Escolha outro.`);
    }

    const id = proximoId(db.usuarios);
    const { sal, hash } = gerarHashSenha(senha);
    const usuario = {
      id,
      usuario: login,
      nome,
      cor: CORES[(id - 1) % CORES.length],
      senhaHash: hash,
      sal,
      criadoEm: agora(),
    };

    db.usuarios.push(usuario);

    // Já entra logado: o cadastro devolve um token, como no login.
    const token = gerarToken();
    db.sessoes.push({ token, usuarioId: id, criadaEm: agora() });
    salvarBanco();

    return responder(res, 201, { token, usuario: publico(usuario) });
  }

  // Login
  if (metodo === "POST" && caminho === "/login") {
    const corpo = await lerCorpo(req);
    const usuario = acharPorLogin(corpo.usuario);

    // Mensagem genérica de propósito: não revela se o usuário existe.
    if (!usuario || !senhaConfere(corpo.senha, usuario)) {
      return erro(res, 401, "Usuário ou senha inválidos.");
    }

    const token = gerarToken();
    db.sessoes.push({ token, usuarioId: usuario.id, criadaEm: agora() });
    salvarBanco();

    return responder(res, 200, { token, usuario: publico(usuario) });
  }

  /* =================== DAQUI PARA BAIXO, SÓ COM TOKEN =================== */

  const eu = usuarioDaRequisicao(req);
  if (!eu) {
    return erro(res, 401, "Não autenticado. Faça login para continuar.");
  }

  // Quem sou eu (útil para o app validar um token guardado)
  if (metodo === "GET" && caminho === "/eu") {
    return responder(res, 200, publico(eu));
  }

  // Logout: invalida o token atual
  if (metodo === "POST" && caminho === "/logout") {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const antes = db.sessoes.length;
    db.sessoes = db.sessoes.filter((s) => s.token !== token);
    if (db.sessoes.length !== antes) salvarBanco();
    return responder(res, 200, { ok: true });
  }

  /* ---------------- usuários ---------------- */

  if (metodo === "GET" && caminho === "/usuarios") {
    return responder(res, 200, db.usuarios.map(publico));
  }

  // Trocar o nome exibido (o login continua o mesmo)
  const casaUsuario = caminho.match(/^\/usuarios\/(\d+)$/);
  if (metodo === "PUT" && casaUsuario) {
    const alvo = acharUsuario(casaUsuario[1]);
    if (!alvo) return erro(res, 404, "Usuário não encontrado.");
    if (alvo.id !== eu.id) return erro(res, 403, "Você só pode editar o seu próprio perfil.");

    const corpo = await lerCorpo(req);
    let mudou = false;

    if (corpo.nome !== undefined) {
      const nome = String(corpo.nome).trim();
      const problema = validarNome(nome);
      if (problema) return erro(res, 400, problema);

      const duplicado = db.usuarios.some(
        (u) => u.id !== alvo.id && u.nome.toLowerCase() === nome.toLowerCase()
      );
      if (duplicado) return erro(res, 409, `Já existe alguém usando o nome "${nome}".`);

      if (nome !== alvo.nome) {
        alvo.nome = nome;
        mudou = true;
      }
    }

    if (corpo.cor !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(corpo.cor))) {
      alvo.cor = String(corpo.cor);
      mudou = true;
    }

    if (mudou) {
      alvo.atualizadoEm = agora();
      salvarBanco();
    }
    return responder(res, 200, publico(alvo));
  }

  /* ---------------- conversas ---------------- */

  if (metodo === "GET" && caminho === "/conversas") {
    const lista = db.conversas
      .filter((c) => c.participantes.includes(eu.id))
      .map((c) => montarConversa(c, eu.id))
      .sort((a, b) => new Date(b.atualizadaEm) - new Date(a.atualizadaEm));

    return responder(res, 200, lista);
  }

  if (metodo === "POST" && caminho === "/conversas") {
    const corpo = await lerCorpo(req);

    // Quem cria sempre participa: o id vem da sessão, não do corpo.
    const participantes = [
      ...new Set([eu.id, ...(Array.isArray(corpo.participantes) ? corpo.participantes.map(Number) : [])]),
    ];
    const titulo = corpo.titulo ? String(corpo.titulo).trim() : null;

    if (participantes.length < 2) return erro(res, 400, "Escolha pelo menos uma pessoa para conversar.");
    const inexistente = participantes.find((id) => !acharUsuario(id));
    if (inexistente) return erro(res, 404, `Usuário ${inexistente} não existe.`);

    // Conversa individual já existente? Reaproveita em vez de duplicar.
    if (participantes.length === 2) {
      const existente = db.conversas.find(
        (c) => c.participantes.length === 2 && participantes.every((id) => c.participantes.includes(id))
      );
      if (existente) return responder(res, 200, montarConversa(existente, eu.id));
    }

    const conversa = {
      id: proximoId(db.conversas),
      titulo: participantes.length > 2 ? titulo || "Novo grupo" : null,
      participantes,
      criadaEm: agora(),
    };
    db.conversas.push(conversa);
    salvarBanco();
    return responder(res, 201, montarConversa(conversa, eu.id));
  }

  // POST /conversas/:id/lida
  const casaLida = caminho.match(/^\/conversas\/(\d+)\/lida$/);
  if (metodo === "POST" && casaLida) {
    const conversa = acharConversa(casaLida[1]);
    if (!conversa) return erro(res, 404, "Conversa não encontrada.");
    if (!conversa.participantes.includes(eu.id)) {
      return erro(res, 403, "Você não participa desta conversa.");
    }

    let alteradas = 0;
    db.mensagens.forEach((m) => {
      if (m.conversaId === conversa.id) {
        m.lidaPor = m.lidaPor || [];
        if (!m.lidaPor.includes(eu.id)) {
          m.lidaPor.push(eu.id);
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

    const conversa = acharConversa(conversaId);
    if (!conversa) return erro(res, 404, "Conversa não encontrada.");
    if (!conversa.participantes.includes(eu.id)) {
      return erro(res, 403, "Você não participa desta conversa.");
    }

    const lista = mensagensDaConversa(conversaId)
      .filter((m) => m.id > depoisDe)
      .map((m) => ({ ...m, autor: publico(acharUsuario(m.autorId)) }));

    return responder(res, 200, lista);
  }

  if (metodo === "POST" && caminho === "/mensagens") {
    const corpo = await lerCorpo(req);
    const conversaId = Number(corpo.conversaId);
    const texto = String(corpo.texto || "").trim();

    const conversa = acharConversa(conversaId);
    if (!conversa) return erro(res, 404, "Conversa não encontrada.");
    if (!conversa.participantes.includes(eu.id)) {
      return erro(res, 403, "Você não participa desta conversa.");
    }
    if (!texto) return erro(res, 400, "A mensagem não pode ser vazia.");
    if (texto.length > 1000) return erro(res, 400, "A mensagem pode ter no máximo 1000 caracteres.");

    const mensagem = {
      id: proximoId(db.mensagens),
      conversaId,
      // O autor vem da sessão: ninguém escreve no lugar de outra pessoa.
      autorId: eu.id,
      texto,
      criadaEm: agora(),
      lidaPor: [eu.id],
    };
    db.mensagens.push(mensagem);
    salvarBanco();
    return responder(res, 201, { ...mensagem, autor: publico(eu) });
  }

  // DELETE /mensagens/:id
  const casaMensagem = caminho.match(/^\/mensagens\/(\d+)$/);
  if (metodo === "DELETE" && casaMensagem) {
    const id = Number(casaMensagem[1]);
    const indice = db.mensagens.findIndex((m) => m.id === id);
    if (indice === -1) return erro(res, 404, "Mensagem não encontrada.");

    if (db.mensagens[indice].autorId !== eu.id) {
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
    erro(res, e.status || 500, e.message || "Erro interno do servidor");
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
  console.log(`  Banco:  ${ARQUIVO_DB}`);
  console.log("  Contas de exemplo: ana / bruno / carla — senha 123456\n");
});
