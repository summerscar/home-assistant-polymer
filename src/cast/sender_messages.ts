import { BaseCastMessage } from "./types";

// Messages to be processed inside the Longan UI

export interface ReceiverStatusMessage extends BaseCastMessage {
  type: "receiver_status";
  connected: boolean;
  showDemo: boolean;
  hassUrl?: string;
  lovelacePath?: string | number | null;
}

export type SenderMessage = ReceiverStatusMessage;
