import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

export interface Message {
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;
  private systemInstruction: string;

  constructor(systemInstruction: string = "You are a helpful assistant.") {
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
    this.systemInstruction = systemInstruction;
  }

  private initChat() {
    this.chat = this.ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: this.systemInstruction,
      },
    });
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.chat) {
      this.initChat();
    }
    const response: GenerateContentResponse = await this.chat!.sendMessage({ message });
    return response.text || "No response from AI.";
  }

  async *sendMessageStream(message: string) {
    if (!this.chat) {
      this.initChat();
    }
    const response = await this.chat!.sendMessageStream({ message });
    for await (const chunk of response) {
      const c = chunk as GenerateContentResponse;
      yield c.text || "";
    }
  }

  resetChat(newSystemInstruction?: string) {
    if (newSystemInstruction) {
      this.systemInstruction = newSystemInstruction;
    }
    this.chat = null;
  }
}
