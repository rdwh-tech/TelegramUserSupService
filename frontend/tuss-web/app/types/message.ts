// app/types/message.ts
export type MessageSenderType = "client" | "operator" | "system";
export type AttachmentFileType = "photo" | "document";

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileType: AttachmentFileType;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: MessageSenderType;
  senderUserId?: string | null;
  senderName?: string | null;
  text: string;
  attachments?: MessageAttachment[];
  isDelivered: boolean;
  createdAt: string;
}

export interface SendMessagePayload {
  ticketId: string;
  text: string;
  attachments?: File[];
}
