import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import open from 'open';
import { HolidayService } from '../holiday';
import Calculator from '../calculation';
import moment from 'moment';

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



function ensureUploadsDirExists() {
  const uploadDir = path.join(__dirname, '../', 'uploads');

  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Uploads folder created successfully');
    }
  } catch (error) {
    console.error('Error creating uploads folder:', error);
  }
}


function openBrowser(url: string) {
  open(url).catch((err: any) => {
    console.error('Failed to open browser:', err);
  });
}

export default function launchGui() {
  ensureUploadsDirExists();

  const app = express();
  const port = 3000;

  app.use(express.json()); // Parses JSON
  app.use(express.urlencoded({ extended: true }));


  app.get('/api/data/config', (req, res) => {
    const configPath = path.join(__dirname, '../../', 'data/config.json');
    console.log('Reading config from:', configPath);
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
      const holidaysPath = path.join(__dirname, '../../', '/data/holidays-data.json');
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
      const holidaysPath = path.join(__dirname, '../../', 'data/holidays.json');

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
    const configPath = path.join(__dirname, '../../', 'data/config.json');

    fs.writeFile(configPath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error saving config.json:', err);
        return res.status(500).json({ error: 'Failed to save configuration' });
      }

      console.log('Configuration saved to config.json');
      console.log(jsonData);
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
    const csvFilePath = `data/data-copied-${timestamp}.csv`;
    const csvPath = path.join(__dirname, '../../', csvFilePath);
    const configPath = path.join(__dirname, '../../', 'data/config.json');

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

      console.log(`Saved to ${csvPath}`, tsvRows.join('\n'));


      Calculator.startInvoice(csvPath, configPath);

      // After calculation, get generated files
          const generatedFiles = getFilesByTimestamp(path.join(__dirname, '../../', 'data'), moment(new Date(timestamp)).subtract(1, 'days').toDate());

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

  const files = getFilesModifiedAfter(path.join(__dirname, '../../', 'data'), moment(sinceDate).subtract(1, 'days').toDate());
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

  // Serve static files (like HTML, CSS, JS)
  app.use(express.static(path.join(__dirname, '../../assets/gui')));

  app.use('/data', express.static(path.join(__dirname, '../../data')));

  app.listen(port, () => {
    console.log(`Bills GUI is running at http://localhost:${port}`);
    openBrowser(`http://localhost:${port}`);
  });

}