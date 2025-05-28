export interface TallyMessage {
  program?: number;
  preview?: number;
}

export interface ServerToClientMessages {
  tally: (data: TallyMessage) => void;
}

export interface ClientToServerMessage {
  'get-tally': () => void;
  pantilt: (data: { id: number, stop?: true, speedX: number, speedY: number }) => void;
  zoom: (data: { id: number, stop?: true, speed: number }) => void;
}