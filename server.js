const express = require('express');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const multer = require('multer');
const XLSX = require('xlsx');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for file uploads
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV o Excel (.xlsx, .xls)'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Data file path
const DATA_FILE = path.join(__dirname, 'data', 'menu.csv');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// Helper: Read menu from CSV
function readMenu() {
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
    return records;
  } catch (err) {
    console.error('Error reading menu CSV:', err.message);
    return [];
  }
}

// Helper: Write menu to CSV
function writeMenu(records) {
  const columns = ['categoria', 'nombre', 'precio', 'descripcion', 'disponible'];
  const csv = stringify(records, {
    header: true,
    columns: columns,
    bom: true
  });
  fs.writeFileSync(DATA_FILE, csv, 'utf-8');
}

// Helper: Parse uploaded file (CSV or Excel) to menu records
function parseUploadedFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Map Excel columns to our format
    return jsonData.map(row => {
      // Try to find matching columns (case insensitive)
      const keys = Object.keys(row);
      const findKey = (names) => keys.find(k => names.includes(k.toLowerCase().trim())) || '';

      const catKey = findKey(['categoria', 'categoría', 'category']);
      const nameKey = findKey(['nombre', 'name', 'plato', 'item']);
      const priceKey = findKey(['precio', 'price', 'coste', 'costo']);
      const descKey = findKey(['descripcion', 'descripción', 'description', 'detalle']);
      const availKey = findKey(['disponible', 'available', 'activo']);

      return {
        categoria: row[catKey] || '',
        nombre: row[nameKey] || '',
        precio: String(row[priceKey] || '0').replace('€', '').replace(',', '.').trim(),
        descripcion: row[descKey] || '',
        disponible: row[availKey] || 'si'
      };
    }).filter(r => r.nombre && r.nombre.trim() !== '');
  }

  return [];
}

// ========== ROUTES ==========

// API: Get menu data
app.get('/api/menu', (req, res) => {
  const menu = readMenu();
  // Group by category
  const grouped = {};
  const categoryOrder = [];

  menu.forEach(item => {
    const cat = item.categoria || 'Sin categoría';
    if (!grouped[cat]) {
      grouped[cat] = [];
      categoryOrder.push(cat);
    }
    if (item.disponible !== 'no') {
      grouped[cat].push({
        nombre: item.nombre,
        precio: parseFloat(item.precio) || 0,
        descripcion: item.descripcion || ''
      });
    }
  });

  res.json({ categories: categoryOrder, menu: grouped });
});

// API: Get all menu data (including unavailable, for admin)
app.get('/api/menu/all', (req, res) => {
  const menu = readMenu();
  res.json(menu);
});

// API: Save entire menu
app.post('/api/menu', (req, res) => {
  try {
    const { password, items } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    writeMenu(items);
    res.json({ success: true, message: 'Menú guardado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Upload CSV/Excel file
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (req.body.password !== ADMIN_PASSWORD) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const records = parseUploadedFile(req.file.path, req.file.originalname);

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    if (records.length === 0) {
      return res.status(400).json({ error: 'No se encontraron datos válidos en el archivo' });
    }

    writeMenu(records);
    res.json({ success: true, message: `Menú actualizado con ${records.length} items`, count: records.length });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// API: Download current CSV
app.get('/api/download', (req, res) => {
  res.download(DATA_FILE, 'menu.csv');
});

// API: Generate QR code
app.get('/api/qr', async (req, res) => {
  try {
    const baseUrl = req.query.url || `${req.protocol}://${req.get('host')}`;
    const qrDataUrl = await QRCode.toDataURL(baseUrl, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#1a1a1a',
        light: '#ffffff'
      }
    });
    res.json({ qr: qrDataUrl, url: baseUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Auth check
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Contraseña incorrecta' });
  }
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve QR page
app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🍽️  Mis Raízes - Cocina Peruana`);
  console.log(`   Carta digital: http://localhost:${PORT}`);
  console.log(`   Panel admin:   http://localhost:${PORT}/admin`);
  console.log(`   Código QR:     http://localhost:${PORT}/qr`);
  console.log(`\n   Contraseña admin: ${ADMIN_PASSWORD}\n`);
});
