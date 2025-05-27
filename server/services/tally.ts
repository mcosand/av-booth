interface Gpio {
  writeSync: (value: number) => void;
  unexport: () => void;
}

export class FakeGpio implements Gpio {
  readonly id: number;
  constructor(id: number) {
    this.id = id;
  }
  
  writeSync(value: number) {
    console.log(`GPIO ${this.id} ${value}`);
  };

  unexport() {
    // nothing needed.
  };
}

const IDS = [522,523,524,525,526,527,528,529,530,531,532,533,534,535,536,537,538,539];

export class TallyService {
  tallies: [Gpio,Gpio][] = [];

  pins: Gpio[] = [];

  async test() {
    let me = { i: 0 };
    setInterval(() => {
      this.pins[me.i].writeSync(0);
      me.i = (me.i + 1) % IDS.length;
      console.log('Turning on ' + (me.i + 10) + ':' + IDS[me.i]);
      this.pins[me.i].writeSync(1);
    }, 500);
  }

  async init() {
    let onoff: any = undefined;
    try {
      //@ts-ignore
      onoff = await import('onoff');
    } catch (error) {
      // okay to fail to load module
      console.log('GPIO module not available')
    }

    if (onoff) {
      console.log('Setting up GPIO...');
      // Use the module if it was successfully imported
      this.tallies = [
        // see cat /sys/kernel/debug/gpio
        [new onoff.Gpio(533, 'out'), new onoff.Gpio(538, 'out')],
        [new onoff.Gpio(532, 'out'), new onoff.Gpio(531, 'out')],
        [new onoff.Gpio(528, 'out'), new onoff.Gpio(525, 'out')],
      ];


      // this.pins = IDS.map(p => new onoff.Gpio(p, 'out'));
 
      process.on('SIGINT', () => {
        console.log('releasing tally outputs...');
        this.tallies.flatMap(t => t).forEach(t => t.unexport());
        this.pins.forEach(t => t.unexport());
      });
    } else {
      this.tallies = [
        [new FakeGpio(1), new FakeGpio(2)],
        [new FakeGpio(3), new FakeGpio(4)],
        [new FakeGpio(5), new FakeGpio(6)],
      ]
    }
  }

  setSources(preview: number|undefined, program: number|undefined) {
    let i = 1;
    console.log('TallyService set source', { preview, program });
    for (const [left,right] of this.tallies) {
      if (program === i) {
        console.log('make red', i);
        left.writeSync(0);
        right.writeSync(1);
      } else if (preview === i) {
        console.log('make green', i);
        left.writeSync(1);
        right.writeSync(0);
      } else {
        console.log('turn off', i);
        left.writeSync(0);
        right.writeSync(0);
      }
      i++;
    }
  }
}