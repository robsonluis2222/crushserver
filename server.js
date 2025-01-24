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

    // Acessando os valores dos campos do formulário
    const coupleName = fields.coupleName ? fields.coupleName[0] : '';
    const declarationText = fields.declarationText ? fields.declarationText[0] : '';
    const relationshipDate = fields.relationshipDate ? fields.relationshipDate[0] : '';
    const coupleLink = fields.coupleLink ? fields.coupleLink[0] : '';
    const selectedPlan = fields.selectedPlan ? fields.selectedPlan[0] : '';  // Se necessário

    let uploadedFiles = [];
    let uploadedBase64Files = [];

    // Validação dos campos obrigatórios
    if (!coupleName || !declarationText || !relationshipDate || !coupleLink || !selectedPlan) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar se foram enviados arquivos
    if (files.photos) {
      let fileIndex = 0;
      Object.values(files.photos).forEach((fileArray) => {
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
    }

    // Verificar se as imagens em Base64 foram enviadas
    if (fields.photosBase64) {
      const base64Files = fields.photosBase64;
      base64Files.forEach((base64, index) => {
        // Remover a parte do header do Base64 (ex: "data:image/jpeg;base64,")
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
        const fileExt = '.jpg'; // Definindo a extensão do arquivo
        const base64FileName = `${coupleLink}_base64_${index + 1}${fileExt}`;  // Nome personalizado para o arquivo
        const base64FilePath = path.join(form.uploadDir, base64FileName);

        // Salvar o arquivo em disco
        fs.writeFile(base64FilePath, base64Data, 'base64', (err) => {
          if (err) {
            console.error('Erro ao salvar imagem em Base64:', err);
          }
        });

        // Armazena o nome do arquivo em Base64 para salvar no banco de dados
        uploadedBase64Files.push(base64FileName);
      });
    }

    // Verifica se algum arquivo foi carregado
    const allUploadedFiles = [...uploadedFiles, ...uploadedBase64Files];
    if (allUploadedFiles.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto foi enviada.' });
    }

    // Logando os valores antes de inserir no banco de dados
    console.log('Campos que serão inseridos no banco de dados:', {
      coupleName,
      relationshipDate,
      declarationText,
      coupleLink,
      uploadedFiles,
      uploadedBase64Files
    });

    // Garantir que sempre passamos 5 parâmetros (não estamos inserindo fotos, apenas informações)
    const insertQuery = `
      INSERT INTO clientes (
        nome_casal,
        background,
        data_casal,
        declaracao,
        urlcall,
        fotos,
        fotos_base64
      ) VALUES (?, 'heart', ?, ?, ?, ?, ?)
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
      sanitizedCoupleLink,                           // urlcall
      JSON.stringify(uploadedFiles),                // fotos (imagens enviadas como arquivo)
      JSON.stringify(uploadedBase64Files)           // fotos_base64 (imagens enviadas como base64)
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
          uploadedFiles,
          uploadedBase64Files,
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
    const musicLink = fields.musicLink ? fields.musicLink[0] : '';  // Recebendo o musicLink

    // Validação dos campos obrigatórios
    if (!coupleName || !declarationText || !relationshipDate || !coupleLink || !selectedPlan || !musicLink) {
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

    // Arrays para armazenar os nomes dos arquivos
    let uploadedFiles = [];
    let uploadedBase64Files = [];

    // Renomeando e salvando as imagens recebidas como arquivo
    let fileIndex = 0;
    Object.values(files).forEach((fileArray) => {
      fileArray.forEach((file) => {
        const fileExt = path.extname(file.originalFilename).toLowerCase(); // Obtém a extensão do arquivo
        const newFileName = `${coupleLink}${fileIndex + 1}.jpg`;  // Nome do arquivo personalizado
        const newFilePath = path.join(form.uploadDir, newFileName);  // Novo caminho completo para o arquivo

        // Renomeia o arquivo e salva no diretório
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

    // Verificando se foram enviadas imagens em Base64
    if (fields.photosBase64) {
      const base64Files = fields.photosBase64;
      base64Files.forEach((base64, index) => {
        // Remover a parte do header do Base64 (ex: "data:image/jpeg;base64,")
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
        const fileExt = '.jpg'; // Definindo a extensão do arquivo
        const base64FileName = `${coupleLink}_base64_${index + 1}${fileExt}`;  // Nome personalizado para o arquivo
        const base64FilePath = path.join(form.uploadDir, base64FileName);

        // Salvar o arquivo em disco
        fs.writeFile(base64FilePath, base64Data, 'base64', (err) => {
          if (err) {
            console.error('Erro ao salvar imagem em Base64:', err);
          }
        });

        // Armazena o nome do arquivo em Base64 para salvar no banco de dados
        uploadedBase64Files.push(base64FileName);
      });
    }

    // Verifica se foram enviadas imagens
    const allUploadedFiles = [...uploadedFiles, ...uploadedBase64Files];
    if (allUploadedFiles.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto foi enviada.' });
    }

    // Logando os valores antes de inserir no banco de dados
    console.log('Campos que serão inseridos no banco de dados:', {
      coupleName,
      relationshipDate,
      declarationText,
      coupleLink,
      selectedPlan,
      musicLink,  // Incluindo o musicLink aqui
      uploadedFiles,  // Listando os arquivos enviados
      uploadedBase64Files  // Listando os arquivos Base64
    });

    // Garantir que sempre passamos 6 parâmetros (não estamos inserindo fotos diretamente no banco)
    const insertQuery = `
      INSERT INTO clientes (
        nome_casal,
        background,
        data_casal,
        declaracao,
        urlcall,
        plano,
        ytlink,
        fotos,
        fotos_base64
      ) VALUES (?, 'heart', ?, ?, ?, ?, ?, ?, ?)
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
    const sanitizedMusicLink = sanitizeString(musicLink);  // Sanitizando o musicLink

    console.log('Parâmetros sanitizados:', {
      sanitizedCoupleName,
      sanitizedRelationshipDate,
      sanitizedDeclarationText,
      sanitizedCoupleLink,
      sanitizedMusicLink  // Incluindo o sanitizedMusicLink
    });

    // Inserindo os dados no banco de dados (agora incluindo o musicLink, fotos e fotos_base64)
    db.execute(insertQuery, [
      sanitizedCoupleName,                          // nome_casal
      sanitizedRelationshipDate,                     // data_casal
      sanitizedDeclarationText,                      // declaracao
      sanitizedCoupleLink,                           // urlcall
      selectedPlan,                                  // plano
      sanitizedMusicLink,                            // ytlink (link do YouTube)
      JSON.stringify(uploadedFiles),                // fotos (arquivos enviados)
      JSON.stringify(uploadedBase64Files)           // fotos_base64 (arquivos em base64)
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
          musicLink,  // Incluindo o musicLink na resposta
          uploadedFiles,
          uploadedBase64Files,  // Incluindo as imagens Base64 na resposta
        },
      });
    });
  });
});




// Inicia o servidor na porta 3000
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
