import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import open from 'open';
import { HolidayService } from '../holiday';
import Calculator from '../calculation';
import moment from 'moment';
import logs,{ wsClients } from '../logs';
import WebSocket from 'ws';
import http from 'http';



/**
 * Reads a directory and returns files modified after a given date.
 * @param dirPath - Absolute or relative path to the directory
 * @param afterDate - JavaScript Date object to filter by
 * @returns Array of file info objects
 */
type FileInfo = {
  name: string;
  path: string;
  mtime: Date;
  url: string;
};

function getFiles(dirPath: string): FileInfo[] {
  const fullPath = path.resolve(dirPath);
  const files = fs.readdirSync(fullPath);

  // Map to file info objects first (so we only stat once per file), then filter by mtime
  return files.map(file => {
    const filePath = path.join(fullPath, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      path: filePath,
      mtime: stats.mtime,
      url: `/data/${file}`
    } as FileInfo;
  }).filter((fileInfo) => {
    // Add your filtering logic here
    return (fileInfo.name.includes('.csv') || fileInfo.name.includes('.tsv') || fileInfo.name.includes('.xlsx') || fileInfo.name.includes('.pdf'));
  });
}


function getFilesModifiedAfter(dirPath: string, afterDate: Date): FileInfo[] {
  const fullPath = path.resolve(dirPath);
  const files = fs.readdirSync(fullPath);

  // Map to file info objects first (so we only stat once per file), then filter by mtime
  return files.map(file => {
    const filePath = path.join(fullPath, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      path: filePath,
      mtime: stats.mtime,
      url: `/data/${file}`
    } as FileInfo;
  }).filter(fileInfo => fileInfo.mtime > afterDate);
}

/**
 * Reads a directory and returns files with timestamps in their names after a given date.
 * @param dirPath
 * @param afterDate 
 * @returns 
 */
function getFilesByTimestamp(dirPath: string, afterDate: Date): string[] {
  const fullPath = path.resolve(dirPath);
  const files = fs.readdirSync(fullPath);

  return files.filter(file => {
    const match = file.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
    if (!match) return false;

    const fileDate = new Date(match[1].replace(/_/g, 'T').replace(/-/g, ':').replace(/:(\d{2})$/, '.$1'));
    return fileDate > afterDate;
  });
}

/**
 * Resolves the absolute path to an asset inside the package.
 * Works in both dev (`lib/gui`) and built (`dist/lib/gui`) environments.
 * @param relativePath - Path inside the assets folder (e.g. 'gui/bootstrap/css/style.css')
 */
export function resolveAssetPath(relativePath: string): string {
  const currentDir = __dirname;

  // Try dist-based path first (global install or built project)
  const distRoot = path.resolve(currentDir, '../../../');
  const distAssetPath = path.join(distRoot, 'assets', relativePath);

  if (fs.existsSync(distAssetPath)) {
    return distAssetPath;
  }

  // Fallback to dev path (project source)
  const devRoot = path.resolve(currentDir, '../../');
  const devAssetPath = path.join(devRoot, 'assets', relativePath);

  if (fs.existsSync(devAssetPath)) {
    return devAssetPath;
  }

  throw new Error(`Asset not found: ${relativePath}`);
}




function ensureDirExists(dir: string = 'uploads') {
  const dirPath = path.join(__dirname, '../', dir);

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logs.info(`Directory created successfully: ${dirPath}`);
    }
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
  }
}


function openBrowser(url: string) {
  open(url).catch((err: any) => {
    console.error('Failed to open browser:', err);
  });
}

export default function launchGui() {
  ensureDirExists();
  ensureDirExists('../data');

  const app = express();
  const isGlobal = !__dirname.startsWith(process.cwd());
  const port = isGlobal ? 3020 : 3010;

  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });



  const dataPath = path.join(process.cwd(), 'data');

  logs.info(`Starting Bills GUI in ${isGlobal ? 'global' : 'local'} mode on port ${port}...`);


  app.use(express.json()); // Parses JSON
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
  logs.info(`method: ${req.method}, url: ${req.url}, Incoming request`);
  next();
});


wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
});



  app.get('/api/data/config', (req, res) => {
    const configPath = path.join(dataPath, 'config.json');
    logs.info(`Reading config from: ${configPath}`);
    fs.readFile(configPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading config.json:', err);
        return res.status(500).json({ error: 'Failed to load configuration' });
      }

      try {
        const config = JSON.parse(data);
        res.json(config);
      } catch (parseError) {
        console.error('Error parsing config.json:', parseError);
        res.status(500).json({ error: 'Invalid JSON format in config file' });
      }
    });
  });

  app.get('/api/data/holidays-data', (req, res) => {
    HolidayService.getPublicHolidaysData('2024', 'GB').then((holidays) => {
      // save result to holidays-data.json
      const holidaysPath = path.join(dataPath, 'holidays-data.json');
      fs.writeFile(holidaysPath, JSON.stringify(holidays, null, 2), (err) => {
        if (err) {
          console.error('Error saving holidays-data.json:', err);
          return res.status(500).json({ error: 'Failed to save holidays data' });
        }
        res.json(holidays);
      });
    }).catch((error) => {
      console.error('Error fetching holidays data:', error);
      res.status(500).json({ error: 'Failed to fetch holidays data' });
    });
  });


  app.get('/api/data/holidays', (req, res) => {
    HolidayService.getPublicHolidays('2024', 'GB').then((holidays) => {
      // save result to holidays.json
      const holidaysPath = path.join(dataPath, 'holidays.json');

      fs.writeFile(holidaysPath, JSON.stringify(holidays, null, 2), (err) => {
        if (err) {
          console.error('Error saving holidays.json:', err);
          return res.status(500).json({ error: 'Failed to save holidays data' });
        }
        res.json(holidays);
      });
    }).catch((error) => {
      console.error('Error fetching holidays data:', error);
      res.status(500).json({ error: 'Failed to fetch holidays data' });
    });
  });



  app.post('/api/data/config', (req, res) => {
    const jsonData = req.body;
    const configPath = path.join(dataPath, 'config.json');

    fs.writeFile(configPath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error saving config.json:', err);
        return res.status(500).json({ error: 'Failed to save configuration' });
      }

      logs.info('Configuration saved to config.json');
      logs.info(jsonData);
      res.json({ message: 'Configuration saved successfully', data: jsonData });
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
  });



  app.post('/api/invoice/generate', (req, res) => {
    const jsonData = req.body;
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')        // Replace colons for Windows compatibility
      .replace(/\..+/, '')       // Remove milliseconds
      .replace('T', '_');        // Replace T with underscore
    const csvFilePath = `data-copied-${timestamp}.csv`;
    const csvPath = path.join(dataPath, csvFilePath);
    const configPath = path.join(dataPath, 'config.json');

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty JSON array' });
    }

    // Extract headers from first object
    const headers = Object.keys(jsonData[0]);

    // Convert each row
    const tsvRows = [headers.join('\t')];

    // Convert each row
    jsonData.forEach(obj => {
      const row = headers.map(header => {
        const val = obj[header] ?? '';
        return String(val).replace(/\t/g, ' '); // Replace tabs inside values
      });
      tsvRows.push(row.join('\t'));
    });



    // Write to file
    fs.writeFile(csvPath, tsvRows.join('\n'), 'utf8', err => {
      if (err) {
        console.error('Error saving invoice.csv:', err);
        return res.status(500).json({ error: 'Failed to save CSV' });
      }

      logs.info(`Saved to ${csvPath} ${tsvRows.join('\n')}`);


      Calculator.startInvoice(csvPath, configPath);

      // After calculation, get generated files
      const generatedFiles = getFilesByTimestamp(path.join(dataPath), moment(new Date(timestamp)).subtract(1, 'days').toDate());

      res.json({
        message: 'Invoice calculation started',
        generatedFiles
      });
    });
  });

  app.get('/api/files/modified-since', (req, res) => {
    const sinceParam = req.query.since;

    if (!sinceParam) {
      return res.status(400).json({ error: 'Missing "since" query parameter' });
    }

    const sinceTimestamp = Number(sinceParam);
    if (isNaN(sinceTimestamp)) {
      return res.status(400).json({ error: 'Invalid timestamp format for "since" parameter' });
    }

    const sinceDate = new Date(sinceTimestamp);

    const files = getFilesModifiedAfter(dataPath, moment(sinceDate).subtract(1, 'days').toDate());
    res.json({ files });
  });


  app.get('/api/files', (req, res) => {
    const files = getFiles(dataPath);
    res.json({ files });
  });




  // Configure storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Make sure this folder exists
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });

  const upload = multer({ storage });

  // Upload route
  app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    res.send(`File uploaded: ${req.file.filename}`);
  });

  //update invoice
  app.post('/api/invoice/update', (req, res) => {
    const jsonData = req.body;
    const configPath = path.join(dataPath, 'config.json');  
    if (!jsonData || Object.keys(jsonData).length === 0) {
      return res.status(400).json({ error: 'Invalid or empty JSON object' });
    } 

    logs.info('\n'+JSON.stringify(jsonData,null,2));
    // Load config
    fs.readFile(configPath, 'utf8', async (err, data) => {
      if (err) {
        console.error('Error reading config.json:', err);
        return res.status(500).json({ error: 'Failed to load configuration' });
      }

      const config = JSON.parse(data);
      // Update the invoice using the loaded config
      await Calculator.updateInvoice(jsonData, config);
      res.json({ message: 'Invoice updated successfully' });
    });
  });

  // Serve static files (like HTML, CSS, JS)
  app.use(express.static(resolveAssetPath('gui')));

  // Serve data files from the current working directory
  app.use('/data', express.static(dataPath));



  server.listen(port, () => {
    logs.info(`Bills GUI is running at http://localhost:${port}`);
    openBrowser(`http://localhost:${port}`);
  });

}