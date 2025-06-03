import http from 'http';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import express from 'express';
import { readFile } from 'fs/promises';
import AtemService from './services/atem';
import { TallyService } from './services/tally';
import { CameraConfig, CamerasService } from './services/cameras';
import { Server as SocketIOServer } from 'socket.io';
import { ClientToServerMessage, ServerToClientMessages, TallyMessage } from '../common/socket-models';
import { OptomaProjectorsService, ProjectorConfig } from './services/optoma';
import { ApiConfigResult } from '../common/api-models';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConfigJson {
  port?: number | string;
  atemIP: string;
  cameras: CameraConfig[];
  projectors: ProjectorConfig[];
}



async function startServer() {
  const config: ConfigJson = JSON.parse(await readFile('./config.json', 'utf-8'));
  console.log('config', config);

  function mapAtemToTallyMessage(source: { program: number | undefined, preview: number | undefined }) {
    return {
      program: CamerasService.getIdFromIndex((source.program ?? -1) - 1, config.cameras),
      preview: CamerasService.getIdFromIndex((source.preview ?? -1) - 1, config.cameras),
    } as TallyMessage;
  }

  const atemSvc = new AtemService(config.atemIP);
  const tallySvc = new TallyService();
  const camerasSvc = new CamerasService(config.cameras);
  const projectorSvc = new OptomaProjectorsService(config.projectors);

  tallySvc.init();

  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer<ClientToServerMessage, ServerToClientMessages>(httpServer, {
    path: '/ws',
    cors: {
      origin: "*", // Replace with your frontend URL in production
    },
  });
  const port = Number(config.port ?? 1885);

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('get-tally', () => socket.emit('tally', mapAtemToTallyMessage(atemSvc.getCurrentSources())));

    socket.on('zoom', ({ id, speed }) => camerasSvc.requestZoom(id, speed));
    socket.on('pantilt', ({ id, speedX, speedY }) => camerasSvc.requestPanTilt(id, speedX, speedY));

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    socket.emit('tally', mapAtemToTallyMessage(atemSvc.getCurrentSources()));
  });

  atemSvc.on('sourcesChanged', (pv, pgm) => {
    console.log('atem sources changed:', pv, pgm);
    io.emit('tally', mapAtemToTallyMessage({ preview: pv, program: pgm }));
    tallySvc.setSources(pv, pgm);
  });
  atemSvc.on('reconnected', () => {
    const srcs = atemSvc.getCurrentSources();
    tallySvc.setSources(srcs.preview, srcs.program);
  })
  atemSvc.start();

  app.get('/api/config', (_, res) => {
    const result: ApiConfigResult = {
      cameras: config.cameras.map((c, i) => ({ id: `cam-${i + 1}`, name: c.name, ip: c.ip })),
      projectors: config.projectors.map((p, i) => ({ id: `proj-${i + 1}`, name: p.name })),
    };
    res.json({ result: result });
  });

  app.post('/api/video/fadeTo/:source', async (req, res) => {
    const src = Number(req.params.source);
    if (isNaN(src)) {
      res.json({ status: 'error' });
      return;
    }
    await atemSvc.fadeToSource(src);
    res.json({ status: 'ok', });
  })

  app.get('/api/cameras/status', async (_req, res) => {
    res.json({ result: await camerasSvc.getAllStatus() });
  })

  // app.post('/api/cameras/power/:state', async (req, res) => {
  //   res.json({ result: await camerasSvc.setPower(req.params.state === 'on') })
  // })

  app.post('/api/cameras/:id/power/:state', async (req, res) => {
    res.json({ result: await camerasSvc.setPower(req.params.id, req.params.state === 'on') })
  })

  app.get('/api/projectors/status', async (_req, res) => {
    res.json({ result: await projectorSvc.getAllStatus() });
  })

  app.post('/api/projectors/:id/power/:state', async (req, res) => {
    res.json({ result: await projectorSvc.setPower(req.params.id, req.params.state === 'on') });
  })

  app.use('/', express.static(resolve(__dirname, 'public')));
  app.get('{*path}', (req, res) => res.sendFile(resolve(__dirname, 'public/index.html')));

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${port}`);
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