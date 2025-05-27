import EventEmitter from 'eventemitter3';
import { BasicAtem, Commands } from 'atem-connection';

export type AtemServiceEvents = {
  reconnected: [],
  sourcesChanged: [number|undefined, number|undefined];
};

export default class AtemService extends EventEmitter<AtemServiceEvents> {
  private readonly ipAddr: string;
  private readonly atem: BasicAtem;
  private isConnected: boolean = false;

  private lastPreview?: number;
  private lastProgram?: number;

  constructor(ipAddr: string) {
    super();

    this.ipAddr = ipAddr;
    this.atem = new BasicAtem();
  }

  async start() {
    this.atem.on('info', console.log)
    this.atem.on('error', console.error);

    this.atem.on('connected', async () => {
      console.log('Connected to ATEM');
      this.isConnected = true;
      this.emit('reconnected');
    });

    this.atem.on('disconnected', () => {
      this.isConnected = false;
      console.log('disconnected');
    })
    this.atem.on('stateChanged', (state, pathToChange) => {
      const { previewInput, programInput } = state.video.mixEffects[0] ?? {};
      if (previewInput !== this.lastPreview || programInput !== this.lastProgram) {
        this.emit('sourcesChanged', previewInput, programInput);
      }
      this.lastPreview = previewInput;
      this.lastProgram = programInput;
    });
    
    await this.atem.connect(this.ipAddr);
  }

  getCurrentSources() {
    console.log(this.atem.state?.video.mixEffects[0]?.previewInput, this.atem.state?.video.mixEffects[0]?.programInput);
    return {
      preview: this.atem.state?.video.mixEffects[0]?.previewInput,
      program: this.atem.state?.video.mixEffects[0]?.programInput,
    };
  }

  async fadeToSource(source: number) {
    if (!this.isConnected) {
      throw new Error('not connected');
    }
    await this.atem.sendCommand(new Commands.PreviewInputCommand(0, source));
    await this.atem.sendCommand(new Commands.AutoTransitionCommand(0));
  }
}