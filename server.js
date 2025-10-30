// ######
// Local onde os pacotes de dependências serão importados
// ######
import express from "express"; // Requisição do pacote do express
import pkg from "pg"; // Requisição do pacote do pg (PostgreSQL)
import dotenv from "dotenv"; // Importa o pacote dotenv para carregar variáveis de ambiente

// ######
// Local onde as configurações do servidor serão feitas
// ######
const app = express(); // Inicializa o servidor Express
const port = 3000; // Define a porta onde o servidor irá escutar
dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env
const { Pool } = pkg; // Obtém o construtor Pool do pacote pg para gerenciar conexões com o banco de dados PostgreSQL
let pool = null; // Variável para armazenar o pool de conexões com o banco de dados
app.use(express.json()); // Middleware para interpretar requisições com corpo em JSON

function conectarBD() {
 if (!pool) {
 pool = new Pool({
 connectionString: process.env.URL_BD,
 });
 }
 return pool;
}

// ######
// Local onde as rotas (endpoints) serão definidas
// ######

app.get("/", async (req, res) => {
 // Rota raiz do servidor
 // Rota GET /
 // Esta rota é chamada quando o usuário acessa a raiz do servidor
 // Ela retorna uma mensagem de boas-vindas e o status da conexão com o banco de dados
 // Cria a rota da raiz do projeto

 console.log("Rota GET / solicitada"); // Log no terminal para indicar que a rota foi acessada

 const db = conectarBD(); // Cria uma nova instância do Pool para gerenciar conexões com o banco de dados

 let dbStatus = "ok";

 // Tenta executar uma consulta simples para verificar a conexão com o banco de dados
 // Se a consulta falhar, captura o erro e define o status do banco de dados como a mensagem de erro
 try {
 await db.query("SELECT 1");
 } catch (e) {
 dbStatus = e.message;
 }

 // Responde com um JSON contendo uma mensagem, o nome do autor e o status da conexão com o banco de dados
 res.json({
 message: "API para Achados e Perdidos", // Substitua pelo conteúdo da sua API
 author: "João Pedro Almeida Caldeira", // Substitua pelo seu nome
 dbStatus: dbStatus,
 });
});

// ######################################################
// ## INÍCIO DAS ROTAS /USUARIOS                      ##
// ######################################################

// [GET] /usuarios - Retorna todos os usuários
app.get("/usuarios", async (req, res) => {
  console.log("Rota GET /usuarios solicitada"); // Log no terminal

  const db = conectarBD(); // Conecta ao banco de dados

  try {
    const resultado = await db.query("SELECT * FROM usuarios"); // Executa a consulta SQL
    const dados = resultado.rows; // Obtém as linhas retornadas
    res.json(dados); // Retorna o resultado como JSON
  } catch (e) {
    console.error("Erro ao buscar usuários:", e); // Log do erro
    res.status(500).json({
      erro: "Erro interno do servidor",
      mensagem: "Não foi possível buscar os usuários",
    });
  }
});

// [GET] /usuarios/:id - Retorna um usuário específico pelo ID
app.get("/usuarios/:id", async (req, res) => {
  console.log("Rota GET /usuarios/:id solicitada"); // Log no terminal

  try {
    const id = req.params.id; // Obtém o ID dos parâmetros da URL
    const db = conectarBD(); // Conecta ao banco de dados
    const consulta = "SELECT * FROM usuarios WHERE id = $1"; // Consulta SQL
    const resultado = await db.query(consulta, [id]); // Executa a consulta com o ID
    const dados = resultado.rows; // Obtém as linhas retornadas

    // Verifica se o usuário foi encontrado
    if (dados.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" }); // Retorna 404
    }

    res.json(dados[0]); // Retorna o primeiro (e único) usuário encontrado
  } catch (e) {
    console.error("Erro ao buscar usuário:", e); // Log do erro
    res.status(500).json({
      erro: "Erro interno do servidor",
    });
  }
});

// [POST] /usuarios - Cria um novo usuário
app.post("/usuarios", async (req, res) => {
  console.log("Rota POST /usuarios solicitada"); // Log no terminal

  try {
    const data = req.body; // Obtém os dados do corpo da requisição

    // Validação simples (assumindo que nome, email e senha são obrigatórios)
    if (!data.nome || !data.email || !data.senha) {
      return res.status(400).json({
        erro: "Dados inválidos",
        mensagem: "Todos os campos (nome, email, senha) são obrigatórios.",
      });
    }

    const db = conectarBD(); // Conecta ao banco de dados

    const consulta =
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *"; // Consulta SQL (RETURNING * é opcional, mas bom para confirmar)
    const usuario = [data.nome, data.email, data.senha]; // Array com os valores
    
    // NOTA: Em um aplicativo real, NUNCA armazene senhas em texto puro.
    // Use bibliotecas como 'bcrypt' para fazer o hash da senha antes de salvar.
    
    const resultado = await db.query(consulta, usuario); // Executa a consulta

    res.status(201).json({ 
      mensagem: "Usuário criado com sucesso!",
      usuario: resultado.rows[0] // Retorna o usuário criado
    });
  } catch (e) {
    console.error("Erro ao inserir usuário:", e); // Log do erro
    res.status(500).json({
      erro: "Erro interno do servidor",
    });
  }
});

// [PUT] /usuarios/:id - Atualiza um usuário existente
app.put("/usuarios/:id", async (req, res) => {
  console.log("Rota PUT /usuarios/:id solicitada"); // Log no terminal

  try {
    const id = req.params.id; // Obtém o ID da URL
    const db = conectarBD(); // Conecta ao banco

    // 1. Verifica se o usuário existe
    let consulta = "SELECT * FROM usuarios WHERE id = $1";
    let resultado = await db.query(consulta, [id]);
    let usuario = resultado.rows;

    if (usuario.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const data = req.body; // Obtém os dados do corpo da requisição

    // 2. Monta os dados para atualização (merge)
    // Usa o valor enviado ou mantém o valor atual do banco
    const nome = data.nome || usuario[0].nome;
    const email = data.email || usuario[0].email;
    
    // (A lógica de atualização de senha geralmente é tratada de forma diferente, 
    // mas para manter o padrão, faremos o merge simples)
    const senha = data.senha || usuario[0].senha; 

    // 3. Atualiza o usuário
    consulta =
      "UPDATE usuarios SET nome = $1, email = $2, senha = $3 WHERE id = $4";
    
    resultado = await db.query(consulta, [
      nome,
      email,
      senha, // Lembre-se da nota sobre hash de senha!
      id,
    ]);

    res.status(200).json({ message: "Usuário atualizado com sucesso!" });
  } catch (e) {
    console.error("Erro ao atualizar usuário:", e); // Log do erro
    res.status(500).json({
      erro: "Erro interno do servidor",
    });
  }
});

// [DELETE] /usuarios/:id - Exclui um usuário
app.delete("/usuarios/:id", async (req, res) => {
  console.log("Rota DELETE /usuarios/:id solicitada"); // Log no terminal

  try {
    const id = req.params.id; // Obtém o ID da URL
    const db = conectarBD(); // Conecta ao banco

    // 1. Verifica se o usuário existe (opcional, mas recomendado)
    let consulta = "SELECT * FROM usuarios WHERE id = $1";
    let resultado = await db.query(consulta, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    // 2. Exclui o usuário
    consulta = "DELETE FROM usuarios WHERE id = $1";
    await db.query(consulta, [id]); // Executa o DELETE

    res.status(200).json({ mensagem: "Usuário excluído com sucesso!!" });
  } catch (e) {
    console.error("Erro ao excluir usuário:", e); // Log do erro
    res.status(500).json({
      erro: "Erro interno do servidor",
    });
  }
});

// ######################################################
// ## FIM DAS ROTAS /USUARIOS                          ##
// ######################################################


// ######################################################
// ## ROTAS /QUESTOES                                  ##
// ######################################################

//server.js
app.get("/questoes", async (req, res) => {
  console.log("Rota GET /questoes solicitada"); // Log no terminal para indicar que a rota foi acessada

  const db = conectarBD(); // Cria uma nova instância do Pool para gerenciar conexões com o banco de dados

  //server.js
  try {
    const resultado = await db.query("SELECT * FROM questoes"); // Executa uma consulta SQL para selecionar todas as questões
    const dados = resultado.rows; // Obtém as linhas retornadas pela consulta
    res.json(dados); // Retorna o resultado da consulta como JSON
  } catch (e) {
    console.error("Erro ao buscar questões:", e); // Log do erro no servidor
    res.status(500).json({
      erro: "Erro interno do servidor",
      mensagem: "Não foi possível buscar as questões",
    });
  }
});

//server.js
app.get("/questoes/:id", async (req, res) => {
  console.log("Rota GET /questoes/:id solicitada"); // Log no terminal para indicar que a rota foi acessada

  try {
    const id = req.params.id; // Obtém o ID da questão a partir dos parâmetros da URL
    const db = conectarBD(); // Conecta ao banco de dados
    const consulta = "SELECT * FROM questoes WHERE id = $1"; // Consulta SQL para selecionar a questão pelo ID
    const resultado = await db.query(consulta, [id]); // Executa a consulta SQL com o ID fornecido
    const dados = resultado.rows; // Obtém as linhas retornadas pela consulta

    // Verifica se a questão foi encontrada
    if (dados.length === 0) {
      return res.status(404).json({ mensagem: "Questão não encontrada" }); // Retorna erro 404 se a questão não for encontrada
    }

    res.json(dados); // Retorna o resultado da consulta como JSON
  } catch (e) {
    console.error("Erro ao buscar questão:", e); // Log do erro no servidor
    res.status(500).json({
      erro: "Erro interno do servidor",
    });
  }
});
//server.js
app.delete("/questoes/:id", async (req, res) => {
  console.log("Rota DELETE /questoes/:id solicitada"); // Log no terminal para indicar que a rota foi acessada

  try {
    const id = req.params.id; // Obtém o ID da questão a partir dos parâmetros da URL
    const db = conectarBD(); // Conecta ao banco de dados
    let consulta = "SELECT * FROM questoes WHERE id = $1"; // Consulta SQL para selecionar a questão pelo ID
    let resultado = await db.query(consulta, [id]); // Executa a consulta SQL com o ID fornecido
    let dados = resultado.rows; // Obtém as linhas retornadas pela consulta

    // Verifica se a questão foi encontrada
    if (dados.length === 0) {
      return res.status(404).json({ mensagem: "Questão não encontrada" }); // Retorna erro 404 se a questão não for encontrada
    }

    consulta = "DELETE FROM questoes WHERE id = $1"; // Consulta SQL para deletar a questão pelo ID
    resultado = await db.query(consulta, [id]); // Executa a consulta SQL com o ID fornecido
    res.status(200).json({ mensagem: "Questão excluida com sucesso!!" }); // Retorna o resultado da consulta como JSON
  } catch (e) {
    console.error("Erro ao excluir questão:", e); // Log do erro no servidor
    res.status(500).json({
      erro: "Erro interno do servidor",
    });
  }
});
//server.js
app.post("/questoes", async (req, res) => {
  console.log("Rota POST /questoes solicitada"); // Log no terminal para indicar que a rota foi acessada

  try {
    const data = req.body; // Obtém os dados do corpo da requisição
    // Validação dos dados recebidos
    if (!data.enunciado || !data.disciplina || !data.tema || !data.nivel) {
      return res.status(400).json({
        erro: "Dados inválidos",
        mensagem:
          "Todos os campos (enunciado, disciplina, tema, nivel) são obrigatórios.",
      });
    }

    const db = conectarBD(); // Conecta ao banco de dados

    const consulta =
      "INSERT INTO questoes (enunciado,disciplina,tema,nivel) VALUES ($1,$2,$3,$4) "; // Consulta SQL para inserir a questão
    const questao = [data.enunciado, data.disciplina, data.tema, data.nivel]; // Array com os valores a serem inseridos
    const resultado = await db.query(consulta, questao); // Executa a consulta SQL com os valores fornecidos
    res.status(201).json({ mensagem: "Questão criada com sucesso!" }); // Retorna o resultado da consulta como JSON
  } catch (e) {
    console.error("Erro ao inserir questão:", e); // Log do erro no servidor
    res.status(500).json({
      erro: "Erro interno do servidor",
    });
  }
});
//server.js
app.put("/questoes/:id", async (req, res) => {
  console.log("Rota PUT /questoes solicitada"); // Log no terminal para indicar que a rota foi acessada

  try {
    const id = req.params.id; // Obtém o ID da questão a partir dos parâmetros da URL
    const db = conectarBD(); // Conecta ao banco de dados
    let consulta = "SELECT * FROM questoes WHERE id = $1"; // Consulta SQL para selecionar a questão pelo ID
    let resultado = await db.query(consulta, [id]); // Executa a consulta SQL com o ID fornecido
    let questao = resultado.rows; // Obtém as linhas retornadas pela consulta

    // Verifica se a questão foi encontrada
    if (questao.length === 0) {
      return res.status(404).json({ message: "Questão não encontrada" }); // Retorna erro 404 se a questão não for encontrada
    }

    const data = req.body; // Obtém os dados do corpo da requisição

    // Usa o valor enviado ou mantém o valor atual do banco
    data.enunciado = data.enunciado || questao[0].enunciado;
    data.disciplina = data.disciplina || questao[0].disciplina;
    data.tema = data.tema || questao[0].tema;
    data.nivel = data.nivel || questao[0].nivel;

    // Atualiza a questão
    consulta =
      "UPDATE questoes SET enunciado = $1, disciplina = $2, tema = $3, nivel = $4 WHERE id = $5";
    // Executa a consulta SQL com os valores fornecidos
    resultado = await db.query(consulta, [
      data.enunciado,
      data.disciplina,
      data.tema,
      data.nivel,
      id,
    ]);

    res.status(200).json({ message: "Questão atualizada com sucesso!" }); // Retorna o resultado da consulta como JSON
  } catch (e) {
    console.error("Erro ao atualizar questão:", e); // Log do erro no servidor
    res.status(500).json({
      erro: "Erro interno do servidor",
    });
  }
});


// ######
// Local onde o servidor irá escutar as requisições
// ######
app.listen(port, () => {
  // Inicia o servidor na porta definida
  // Um socket para "escutar" as requisições
  console.log(`Serviço rodando na porta:  ${port}`);
});