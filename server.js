const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000; // importante para Render

app.use(cors());
app.use(express.json());

const submissionsFilePath = path.join(__dirname, 'submissions.json');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// POST: criar submissão
app.post('/api/submissions', upload.array('documentos', 5), (req, res) => {
  console.log('Dados do formulário recebidos:', req.body);
  console.log('Arquivos recebidos:', req.files);

  const newSubmission = {
    id: Date.now(),
    receivedAt: new Date().toISOString(),
    formData: req.body,
    files: req.files.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      size: file.size,
    })),
  };

  fs.readFile(submissionsFilePath, 'utf8', (err, data) => {
    if (err && err.code !== 'ENOENT') {
      console.error(err);
      return res.status(500).send('Erro ao ler o arquivo de submissões.');
    }

    const submissions = data ? JSON.parse(data) : [];
    submissions.push(newSubmission);

    fs.writeFile(submissionsFilePath, JSON.stringify(submissions, null, 2), (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Erro ao salvar a submissão.');
      }
      res.status(201).json(newSubmission);
    });
  });
});

// GET: listar submissões
app.get('/api/submissions', (req, res) => {
  fs.readFile(submissionsFilePath, 'utf8', (err, data) => {
    if (err && err.code !== 'ENOENT') {
      console.error(err);
      return res.status(500).send('Erro ao ler o arquivo de submissões.');
    }

    const submissions = data ? JSON.parse(data) : [];
    res.json(submissions);
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
