export interface TallyMessage {
  program?: number;
  preview?: number;
}

export interface ServerToClientMessages {
  tally: (data: TallyMessage) => void;
}

export interface ClientToServerMessage {
  'get-tally': () => void;
  pantilt: (data: { id: number, speedX: number, speedY: number }) => void;
  zoom: (data: { id: number, speed: number }) => void;
}