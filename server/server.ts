import http from 'http';
import express from 'express';
import { readFile } from 'fs/promises';
import AtemService from './services/atem';
import { TallyService } from './services/tally';
import { CameraConfig, CamerasService } from './services/cameras';
import { Server as SocketIOServer } from 'socket.io';
import { ClientToServerMessage, ServerToClientMessages, TallyMessage } from '../common/socket-models';

interface ConfigJson {
  port?: number | string;
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
    socket.on('zoom', data => {
      console.log('zoom', data);
    })

    socket.on('get-tally', () => {
      socket.emit('tally', atemSvc.getCurrentSources());
    });

    socket.on('zoom', ({ id, speed }) => {
      camerasSvc.requestZoom(id, speed);
    })
    // socket.on('message', (data) => {
    //   console.log(`Received message of type ${data.type}`, data.payload);

    //   switch (data.type) {
    //     case 'CAMERA_CONTROL':
    //       // Process camera control
    //       break;
    //     case 'CHAT':
    //       // Handle other message types
    //       break;
    //     default:
    //       console.warn('Unknown message type:', data.type);
    //   }
    // });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    socket.emit('tally', atemSvc.getCurrentSources());
  });

  atemSvc.on('sourcesChanged', (pv, pgm) => {
    console.log('atem sources changed:', pv, pgm);
    io.emit('tally', { program: pgm, preview: pv } as TallyMessage);
    tallySvc.setSources(pv, pgm);
  });
  atemSvc.on('reconnected', () => {
    const srcs = atemSvc.getCurrentSources();
    tallySvc.setSources(srcs.preview, srcs.program);
  })
  atemSvc.start();

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
      res.json({ status: 'error' });
      return;
    }
    await atemSvc.fadeToSource(src);
    res.json({ status: 'ok', });
  })

  app.get('/api/cameras/status', async (_req, res) => {
    res.json({ result: await camerasSvc.getStatus() });
  })

  app.post('/api/cameras/power/:state', async (req, res) => {
    res.json({ result: await camerasSvc.setPower(req.params.state === 'on') })
  })

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