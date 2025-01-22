const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());

// Conexão com o banco de dados MySQL
const db = mysql.createPool({
  host: 'auth-db1844.hstgr.io',
  user: 'u290711684_admincmc',
  password: 'Binho2108!',
  database: 'u290711684_crushmycrush',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,  // Timeout para conectar em milissegundos
  acquireTimeout: 10000   // Timeout para adquirir uma conexão do pool
});



// Middleware para parsing de JSON e URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para servir arquivos estáticos da pasta 'images'
app.use('/images', express.static(path.join(__dirname, 'images')));

// Rota para consultar dados do cliente pelo 'urlcall'
app.get('/consultarCliente', (req, res) => {
  const { urlcall } = req.query;

  if (!urlcall) {
    return res.status(400).json({ error: 'urlcall é obrigatório' });
  }

  const query = 'SELECT * FROM clientes WHERE urlcall = ?';
  db.execute(query, [urlcall], (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err.stack);
      return res.status(500).json({ error: 'Erro no servidor ao consultar o banco de dados' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    res.json(results[0]);
  });
});

// Rota para receber os dados e salvar no banco e no servidor
app.post('/api/submit', (req, res) => {
  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(__dirname, 'images'); // Diretório onde as imagens serão armazenadas
  form.keepExtensions = true; // Manter as extensões originais dos arquivos
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Erro no processamento do formulário:', err);
      return res.status(500).json({ error: 'Erro ao processar o upload de arquivos' });
    }

    console.log('Campos recebidos:', fields);
    console.log('Arquivos recebidos:', files);

    // Acessando o primeiro valor de cada campo que veio como array
    const coupleName = fields.coupleName ? fields.coupleName[0] : '';
    const declarationText = fields.declarationText ? fields.declarationText[0] : '';
    const relationshipDate = fields.relationshipDate ? fields.relationshipDate[0] : '';
    const coupleLink = fields.coupleLink ? fields.coupleLink[0] : '';
    const selectedPlan = fields.selectedPlan ? fields.selectedPlan[0] : '';  // Se necessário

    let uploadedFiles = [];

    // Validação dos campos obrigatórios
    if (!coupleName || !declarationText || !relationshipDate || !coupleLink || !selectedPlan) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Renomeando as imagens conforme o nome do casal e número
    let fileIndex = 0;
    Object.values(files).forEach((fileArray) => {
      fileArray.forEach((file) => {
        const fileExt = path.extname(file.originalFilename).toLowerCase(); // Obtém a extensão do arquivo
        const newFileName = `${coupleLink}${fileIndex + 1}.jpg`;  // Nome do arquivo personalizado
        const newFilePath = path.join(form.uploadDir, newFileName);  // Novo caminho completo para o arquivo

        // Renomeia o arquivo
        fs.rename(file.filepath, newFilePath, (err) => {
          if (err) {
            console.error('Erro ao renomear o arquivo:', err);
          }
        });

        // Armazena o nome do arquivo para salvar no banco de dados
        uploadedFiles.push(newFileName);
        fileIndex++;
      });
    });

    // Verifica se os arquivos foram enviados corretamente
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto foi enviada.' });
    }

    // Logando os valores antes de inserir no banco de dados
    console.log('Campos que serão inseridos no banco de dados:', {
      coupleName,
      relationshipDate,
      declarationText,
      coupleLink
    });

    // Garantir que sempre passamos 5 parâmetros (não estamos inserindo fotos, apenas informações)
    const insertQuery = `
      INSERT INTO clientes (
        nome_casal,
        background,
        data_casal,
        declaracao,
        urlcall
      ) VALUES (?, 'heart', ?, ?, ?)
    `;

    // Função para garantir que o valor seja uma string e não seja null ou undefined
    const sanitizeString = (value) => {
      return typeof value === 'string' ? value.trim() : '';
    };

    // Sanitizando os valores para garantir que sejam strings válidas
    const sanitizedCoupleName = sanitizeString(coupleName);
    const sanitizedRelationshipDate = sanitizeString(relationshipDate);
    const sanitizedDeclarationText = sanitizeString(declarationText);
    const sanitizedCoupleLink = sanitizeString(coupleLink);

    console.log('Parâmetros sanitizados:', {
      sanitizedCoupleName,
      sanitizedRelationshipDate,
      sanitizedDeclarationText,
      sanitizedCoupleLink
    });

    // Inserindo os dados no banco de dados
    db.execute(insertQuery, [
      sanitizedCoupleName,                          // nome_casal
      sanitizedRelationshipDate,                     // data_casal
      sanitizedDeclarationText,                      // declaracao
      sanitizedCoupleLink                           // urlcall
    ], (err, result) => {
      if (err) {
        console.error('Erro ao inserir dados no banco:', err.stack);
        return res.status(500).json({ error: 'Erro ao salvar no banco de dados' });
      }

      res.status(200).json({
        message: 'Dados recebidos e armazenados com sucesso!',
        data: {
          coupleName,
          declarationText,
          relationshipDate,
          coupleLink,
        },
      });
    });
  });
});


app.post('/api/submit-pro', (req, res) => {
  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(__dirname, 'images'); // Diretório onde as imagens serão armazenadas
  form.keepExtensions = true; // Manter as extensões originais dos arquivos
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Erro no processamento do formulário:', err);
      return res.status(500).json({ error: 'Erro ao processar o upload de arquivos' });
    }

    console.log('Campos recebidos:', fields);
    console.log('Arquivos recebidos:', files);

    // Acessando os valores dos campos que vieram como array
    const coupleName = fields.coupleName ? fields.coupleName[0] : '';
    const declarationText = fields.declarationText ? fields.declarationText[0] : '';
    const relationshipDate = fields.relationshipDate ? fields.relationshipDate[0] : '';
    const coupleLink = fields.coupleLink ? fields.coupleLink[0] : '';
    const selectedPlan = fields.selectedPlan ? fields.selectedPlan[0] : '';  // Se necessário

    // Validação dos campos obrigatórios
    if (!coupleName || !declarationText || !relationshipDate || !coupleLink || !selectedPlan) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificando se foram enviadas até 7 fotos
    let totalFiles = 0;
    Object.values(files).forEach((fileArray) => {
      totalFiles += fileArray.length;
    });

    if (totalFiles > 7) {
      return res.status(400).json({ error: 'Você pode enviar no máximo 7 fotos.' });
    }

    // Renomeando as imagens e salvando no diretório
    let fileIndex = 0;
    Object.values(files).forEach((fileArray) => {
      fileArray.forEach((file) => {
        const fileExt = path.extname(file.originalFilename).toLowerCase(); // Obtém a extensão do arquivo
        const newFileName = `${coupleLink}${fileIndex + 1}.jpg`;  // Nome do arquivo personalizado
        const newFilePath = path.join(form.uploadDir, newFileName);  // Novo caminho completo para o arquivo

        // Renomeia o arquivo
        fs.rename(file.filepath, newFilePath, (err) => {
          if (err) {
            console.error('Erro ao renomear o arquivo:', err);
          }
        });

        fileIndex++;
      });
    });

    // Logando os valores antes de inserir no banco de dados
    console.log('Campos que serão inseridos no banco de dados:', {
      coupleName,
      relationshipDate,
      declarationText,
      coupleLink,
      selectedPlan
    });

    // Garantir que sempre passamos 5 parâmetros (não estamos inserindo fotos no banco)
    const insertQuery = `
      INSERT INTO clientes (
        nome_casal,
        background,
        data_casal,
        declaracao,
        urlcall,
        plano
      ) VALUES (?, 'heart', ?, ?, ?, ?)
    `;

    // Função para garantir que o valor seja uma string e não seja null ou undefined
    const sanitizeString = (value) => {
      return typeof value === 'string' ? value.trim() : '';
    };

    // Sanitizando os valores para garantir que sejam strings válidas
    const sanitizedCoupleName = sanitizeString(coupleName);
    const sanitizedRelationshipDate = sanitizeString(relationshipDate);
    const sanitizedDeclarationText = sanitizeString(declarationText);
    const sanitizedCoupleLink = sanitizeString(coupleLink);

    console.log('Parâmetros sanitizados:', {
      sanitizedCoupleName,
      sanitizedRelationshipDate,
      sanitizedDeclarationText,
      sanitizedCoupleLink
    });

    // Inserindo os dados no banco de dados (sem fotos)
    db.execute(insertQuery, [
      sanitizedCoupleName,                          // nome_casal
      sanitizedRelationshipDate,                     // data_casal
      sanitizedDeclarationText,                      // declaracao
      sanitizedCoupleLink,                           // urlcall
      selectedPlan
    ], (err, result) => {
      if (err) {
        console.error('Erro ao inserir dados no banco:', err.stack);
        return res.status(500).json({ error: 'Erro ao salvar no banco de dados' });
      }

      res.status(200).json({
        message: 'Dados recebidos e armazenados com sucesso!',
        data: {
          coupleName,
          declarationText,
          relationshipDate,
          coupleLink,
        },
      });
    });
  });
});




// Inicia o servidor na porta 3000
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
