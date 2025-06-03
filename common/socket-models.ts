export interface TallyMessage {
  program?: string;
  preview?: string;
}

export interface ServerToClientMessages {
  tally: (data: TallyMessage) => void;
}

export interface ClientToServerMessage {
  'get-tally': () => void;
  pantilt: (data: { id: string, speedX: number, speedY: number }) => void;
  zoom: (data: { id: string, speed: number }) => void;
}