export interface Email {
  id: string;
  sender: string;
  subject: string;
  recipient_address: string;
  body_text: string | null;
  body_html?: string | null;
  received_at: string;
}
