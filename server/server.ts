import express from 'express';
import { readFile } from 'fs/promises';
import AtemService from './services/atem';
import { TallyService } from './services/tally';
import { CameraConfig, CamerasService } from './services/cameras';

interface ConfigJson {
  port?: number|string;
  atemIP: string;
  cameras: CameraConfig[];
}

async function startServer() {
  const config: ConfigJson = JSON.parse(await readFile('./config.json', 'utf-8'));
  console.log('config', config);

  const atemSvc = new AtemService(config.atemIP);
  const tallySvc = new TallyService();
  const camerasSvc = new CamerasService(config.cameras);

  
  console.log(await camerasSvc.getStatus());

  tallySvc.init();
 // tallySvc.test();
  atemSvc.on('sourcesChanged', (pv, pgm) => {
    console.log('atem sources changed:', pv, pgm);
    tallySvc.setSources(pv, pgm);
  });
  atemSvc.on('reconnected', () => {
    const srcs = atemSvc.getCurrentSources();
    tallySvc.setSources(srcs.preview, srcs.program);
  })
  atemSvc.start();

  const app = express();
  const port = Number(config.port ?? 1885);

  app.use('/', express.static('./public'))

  app.get('/hi', (_req, res) => {
    res.send('Hello from TypeScript backend!');
  });

  app.get('/api/config', (_, res) => {
    res.json({
      cameras: config.cameras.map(c => ({ ip: c.ip })),
    });
  });

  app.post('/api/video/fadeTo/:source', async (req, res) => {
    const src = Number(req.params.source);
    if (isNaN(src)) {
      res.json({status:'error'});
      return;
    }
    await atemSvc.fadeToSource(src);
    res.json({status:'ok', });
  })

  app.get('/api/cameras/status', async (_req, res) => {
    res.json({ result: await camerasSvc.getStatus() });
  })

  app.post('/api/cameras/power/:state', async (req, res) => {
    res.json({ result: await camerasSvc.setPower(req.params.state === 'on')})
  })

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

async function setAtemSource(src: number) {
  const config = JSON.parse(await readFile('./config.json', 'utf-8'));
  const atemSvc = new AtemService(config.atemIP);

  atemSvc.on('reconnected', () => {
    console.log('asking to use source ' + src);
    atemSvc.fadeToSource(src);
  });
  await atemSvc.start();
}

if (process.argv[2] === 'change-pgm') {
  const src = Number(process.argv[3]);
  if (isNaN(src)) {
    console.log('must specific source id');
  } else {
    setAtemSource(src);
  }
} else {
  startServer();
}