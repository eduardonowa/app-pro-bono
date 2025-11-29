const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ======================================================
//  Criar pasta uploads se não existir
// ======================================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ======================================================
//  Caminho do "banco de dados" JSON
// ======================================================
const dbPath = path.join(__dirname, 'submissions.json');

// Cria um array vazio caso o arquivo não exista
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '[]');
}

// ======================================================
//  Funções utilitárias de DB
// ======================================================
function loadDB() {
  try {
    const content = fs.readFileSync(dbPath, 'utf8').trim();

    if (!content) {
      fs.writeFileSync(dbPath, '[]');
      return [];
    }

    return JSON.parse(content);
  } catch (err) {
    console.error('DB corrompido. Resetando.', err);
    fs.writeFileSync(dbPath, '[]');
    return [];
  }
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ======================================================
//  Configuração Multer (uploads)
// ======================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),

  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage });

// ======================================================
//  A) RECEBER submissões (com arquivos)
// ======================================================
app.post('/api/submissions', upload.array('documentos', 5), (req, res) => {
  try {
    const db = loadDB();

    const newSubmission = {
      id: Date.now().toString(),
      data: req.body,
      documentos: req.files.map((f) => f.filename),
      createdAt: new Date().toISOString(),
    };

    db.push(newSubmission);
    saveDB(db);

    res.status(201).json({
      message: 'Solicitação registrada com sucesso!',
      id: newSubmission.id,
    });
  } catch (err) {
    console.error('Erro ao salvar submissão:', err);
    res.status(500).json({ error: 'Erro ao salvar submissão.' });
  }
});

// ======================================================
//  B) LISTAR todas as submissões
// ======================================================
app.get('/api/submissions', (req, res) => {
  const db = loadDB();
  res.json(db);
});

// ======================================================
//  C) LISTAR uma submissão específica
// ======================================================
app.get('/api/submissions/:id', (req, res) => {
  const db = loadDB();
  const item = db.find((sub) => sub.id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Submissão não encontrada.' });
  }

  res.json(item);
});

// ======================================================
//  Download de arquivos enviados
// ======================================================
app.get('/api/files/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado.' });
  }

  res.download(filePath);
});

// ======================================================
//  Health Check
// ======================================================
app.get('/', (req, res) => {
  res.send('API Online');
});

// ======================================================
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
