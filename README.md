# 💬 ZapZap — App de Chat em React Native (Expo) + API REST

> Projeto educacional para **Sistemas de Informação**. Um app de mensagens no estilo **WhatsApp/Messenger**, feito em **React Native (Expo)**, consumindo uma **API REST** própria com **GET / POST / DELETE** e **JSON**.
>
> Mesmos conceitos do projeto de cadastro de equipamentos — `useState`, `useEffect`, `useCallback`, `FlatList`, `RefreshControl`, `ActivityIndicator`, `KeyboardAvoidingView`, validação de formulário e tratamento de erros — aplicados a um caso de uso maior.

---

## 📚 Sumário

- [O que o app faz](#-o-que-o-app-faz)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [▶️ Passo a passo para rodar](#️-passo-a-passo-para-rodar)
- [Conversando entre dois dispositivos](#-conversando-entre-dois-dispositivos)
- [Endpoints da API](#-endpoints-da-api)
- [Testes rápidos com curl](#-testes-rápidos-com-curl)
- [Como o código funciona](#-como-o-código-funciona)
- [Validações](#-validações)
- [Erros comuns e correções](#-erros-comuns-e-correções)
- [Exercícios sugeridos](#-exercícios-sugeridos)
- [Licença](#-licença)

---

## 🎯 O que o app faz

- **Entrar** escolhendo um usuário existente ou criando um novo (`POST /usuarios`).
- **Lista de conversas** com avatar, prévia da última mensagem, hora e **badge de não lidas**.
- **Busca** por nome/mensagem e filtro **"só não lidas"** (`Switch`).
- **Nova conversa** individual ou **grupo** (seleção múltipla de contatos).
- **Tela de chat** com balões (verde à direita = suas), separadores de dia (Hoje/Ontem/data), **✓ / ✓✓** de leitura e **atualização automática a cada 2,5s**.
- **Enviar** mensagem (`POST /mensagens`) e **apagar** as suas (toque longo → `DELETE /mensagens/:id`).
- **Pull-to-refresh** em todas as listas e indicadores de carregamento.

---

## 🗂 Estrutura do projeto

```
zapzap/
├── servidor/                 # API REST (Node puro, ZERO dependências)
│   ├── server.js
│   ├── package.json
│   └── db.json               # criado automaticamente na 1ª execução
└── app-expo/                 # App React Native (Expo)
    ├── App.js                # navegação por estado: login → conversas → chat
    ├── index.js
    ├── app.json
    ├── package.json
    └── src/
        ├── api.js            # todas as chamadas HTTP ficam aqui
        ├── tema.js           # cores e espaçamentos
        ├── utils.js          # datas, iniciais, Alert compatível com web
        ├── componentes/
        │   ├── Avatar.js
        │   ├── Balao.js
        │   ├── ItemConversa.js
        │   └── Vazio.js
        └── telas/
            ├── TelaLogin.js
            ├── TelaConversas.js
            ├── TelaChat.js
            └── TelaNovaConversa.js
```

---

## ▶️ Passo a passo para rodar

### Pré-requisitos

| O que | Por quê |
|---|---|
| **Node.js LTS** (20 ou superior) — [nodejs.org](https://nodejs.org) | roda o servidor e o Expo |
| App **Expo Go** (Android/iOS) | abrir no celular (opcional) |

Confira a instalação:

```bash
node -v
npm -v
```

### 1) Subir o servidor (API)

Em um terminal:

```bash
cd zapzap/servidor
node server.js
```

Saída esperada:

```
  ZapZap API no ar 🚀
  Local:  http://localhost:3333
  Rede:   http://192.168.0.15:3333   <- use este no celular
  Banco:  .../servidor/db.json
```

> **Não precisa de `npm install`** — o servidor usa só módulos nativos do Node.
> Os dados ficam em `servidor/db.json`. Apagar esse arquivo reseta tudo (Ana, Bruno e Carla voltam).
> Para trocar a porta: `PORT=4000 node server.js`.

### 2) Instalar as dependências do app

Em **outro** terminal (deixe o servidor rodando):

```bash
cd zapzap/app-expo
npm install
npx expo install react-dom react-native-web @expo/metro-runtime
```

> O segundo comando instala o suporte **web** já com as versões certas para o seu SDK.
> Se aparecer aviso de incompatibilidade de versões, rode `npx expo install --fix`.

### 3) Rodar o app

```bash
npx expo start
```

Agora escolha:

- **Web** → tecle `w` (abre em `http://localhost:8081`)
- **Celular** → abra o **Expo Go** e escaneie o QR Code (celular e computador **na mesma rede Wi-Fi**)
- **Emulador** → tecle `a` (Android) ou `i` (iOS/macOS)

### 4) Usar

1. Na tela inicial, toque em **Ana** (ou crie um usuário novo).
2. Toque no botão **+** para iniciar uma conversa.
3. Escreva e envie. 🎉

> **Endereço do servidor:** o app descobre sozinho o IP do computador (via Expo). Se precisar apontar manualmente — servidor em outra máquina, porta diferente, rede estranha — ligue **"Configurar servidor"** na tela inicial e informe, por exemplo, `http://192.168.0.15:3333`.

---

## 👥 Conversando entre dois dispositivos

O chat é real: abra o app em dois lugares e converse.

1. **Aba 1 do navegador** → entre como **Ana**.
2. **Aba 2 (anônima) ou celular** → entre como **Bruno**.
3. Ana manda mensagem → em até ~2,5s ela aparece na tela do Bruno, com badge de não lida na lista.

> Precisa que o celular alcance o computador: mesma rede Wi-Fi e, no Windows, permitir o Node no **Firewall** (rede privada).

---

## 🔌 Endpoints da API

Base: `http://localhost:3333` (ou `http://SEU_IP:3333`)

| Método | Rota | Corpo / Query | O que faz |
|---|---|---|---|
| GET | `/health` | — | status do servidor |
| GET | `/usuarios` | — | lista usuários |
| POST | `/usuarios` | `{ "nome": "Ana" }` | cria usuário |
| GET | `/conversas` | `?usuarioId=1` | conversas do usuário, com `ultimaMensagem` e `naoLidas` |
| POST | `/conversas` | `{ "participantes": [1,2], "titulo": null }` | cria (ou reaproveita) conversa |
| POST | `/conversas/:id/lida` | `{ "usuarioId": 1 }` | marca tudo como lido |
| GET | `/mensagens` | `?conversaId=1&depoisDe=0` | mensagens da conversa |
| POST | `/mensagens` | `{ "conversaId":1, "autorId":1, "texto":"oi" }` | envia mensagem |
| DELETE | `/mensagens/:id` | `?usuarioId=1` | apaga a própria mensagem |

**Exemplo de mensagem (JSON):**

```json
{
  "id": 4,
  "conversaId": 1,
  "autorId": 2,
  "texto": "Bora fazer o trabalho?",
  "criadaEm": "2026-08-27T18:49:42.340Z",
  "lidaPor": [2]
}
```

Códigos usados: **2xx** sucesso • **400** validação • **403** proibido • **404** não encontrado • **409** nome duplicado • **500** erro do servidor.

---

## 🧪 Testes rápidos com curl

```bash
# Servidor no ar?
curl http://localhost:3333/health

# Listar usuários
curl http://localhost:3333/usuarios

# Criar usuário
curl -X POST http://localhost:3333/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Diego"}'

# Conversas da Ana (id 1)
curl "http://localhost:3333/conversas?usuarioId=1"

# Enviar mensagem
curl -X POST http://localhost:3333/mensagens \
  -H "Content-Type: application/json" \
  -d '{"conversaId":1,"autorId":1,"texto":"mensagem de teste"}'

# Ler a conversa
curl "http://localhost:3333/mensagens?conversaId=1"
```

---

## 🧠 Como o código funciona

### Estado (`useState`)
Cada tela guarda o que muda na interface: `mensagens`, `conversas`, `carregando`, `atualizando`, `enviando`, `texto`, `busca`… Ao mudar o estado, a tela é **re-renderizada**.

### Efeitos (`useEffect`)
- Na montagem, dispara a primeira busca (`GET`).
- Cria um `setInterval` que rebusca periodicamente (4s na lista, 2,5s no chat) — é o "tempo real" simplificado, chamado **polling**.
- O `return` do efeito faz a **limpeza**: `clearInterval` + flag `montado` para não atualizar estado de tela já fechada.

### Funções memorizadas (`useCallback`)
`buscarConversas`, `buscarMensagens` e `aoAtualizar` mantêm a mesma referência entre renders — evitam recriar o efeito a cada re-render (o que causaria um loop de requisições).

### `useMemo`
Filtro de busca e montagem dos separadores de dia só são recalculados quando os dados realmente mudam.

### Fluxo de uma mensagem

```
Digita → validação → POST /mensagens → 201 Created
       → adiciona no estado local (aparece na hora)
       → polling faz GET /mensagens e sincroniza os dois lados
       → ao abrir a conversa: POST /conversas/:id/lida (zera o badge)
```

### Componentes de UI usados
`SafeAreaView`, `View`, `Text`, `TextInput`, `TouchableOpacity`, `FlatList`, `RefreshControl`, `ActivityIndicator`, `Switch`, `KeyboardAvoidingView`, `StatusBar`, `StyleSheet` e `Alert` (com wrapper que também funciona na web).

---

## ✅ Validações

**No app (antes de gastar rede):**

| Campo | Regra |
|---|---|
| Nome do usuário | não vazio, 2 a 30 caracteres, sem repetir nome existente |
| Nome do grupo | obrigatório quando há 2+ contatos selecionados |
| Contatos | pelo menos 1 selecionado |
| Mensagem | não vazia (`.trim()`), até 1000 caracteres |

**No servidor (nunca confie só no cliente):** as mesmas regras + só participante envia na conversa, só o autor apaga a própria mensagem.

---

## 🐞 Erros comuns e correções

**"Não consegui falar com http://…:3333"**
O servidor não está rodando ou o IP está errado. Rode `node server.js` e teste `curl http://localhost:3333/health`.

**Funciona na web, mas não no celular**
Celular e computador precisam estar na **mesma rede Wi-Fi**. Use o IP mostrado como `Rede:` na saída do servidor e libere o Node no firewall do Windows. Se necessário, informe o endereço na opção "Configurar servidor".

**`EADDRINUSE: address already in use`**
A porta 3333 já está ocupada. Feche o outro processo ou rode `PORT=4000 node server.js` (e ajuste o endereço no app).

**CORS no navegador**
O servidor já envia `Access-Control-Allow-Origin: *`. Se editar o `server.js`, mantenha os cabeçalhos e o tratamento do método `OPTIONS`.

**Erro de versão do Expo / SDK**
Rode `npx expo install --fix` dentro de `app-expo/`. Se o Expo Go reclamar do SDK, crie um projeto novo com `npx create-expo-app` e copie `App.js`, `index.js` e a pasta `src/` para dentro dele.

**Template literals**
Interpolação só funciona com **crases**: `` `GET falhou: ${res.status}` `` — nunca com aspas simples.

---

## 🧑‍🏫 Exercícios sugeridos

1. **Editar mensagem** (`PUT /mensagens/:id`).
2. **"Digitando…"**: novo endpoint com timestamp e exibição no cabeçalho do chat.
3. **Anexos**: enviar um link/imagem por URL e renderizar com `Image`.
4. **Busca dentro do chat** com destaque do termo.
5. **Trocar polling por WebSocket** (`ws`) e comparar o consumo de rede.
6. **Persistir o login** com `AsyncStorage`.
7. **Paginação**: carregar as mensagens antigas ao puxar para cima.
8. **Reações** (👍❤️😂) por mensagem.

---

## 📄 Licença

Uso livre para fins educacionais — turmas de **Sistemas de Informação**, praticando **APIs REST** em apps móveis com **React Native**.
