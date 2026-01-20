declare module 'nodemailer' {
  interface TransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
  }

  interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
  }

  interface SentMessageInfo {
    messageId: string;
    envelope: {
      from: string;
      to: string[];
    };
    accepted: string[];
    rejected: string[];
    pending: string[];
    response: string;
  }

  interface Transporter {
    verify(): Promise<true>;
    sendMail(mailOptions: MailOptions): Promise<SentMessageInfo>;
    close(): void;
  }

  export function createTransport(options: TransportOptions): Transporter;
}
