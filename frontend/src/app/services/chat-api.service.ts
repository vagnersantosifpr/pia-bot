// src/app/services/chat-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Define a interface para a resposta da API
export interface ChatResponse {
  reply: string;
}


// NOVA INTERFACE PARA A MENSAGEM DO FEED
export interface MessageFeedItem {
  _id: string;
  userId: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}


@Injectable({
  providedIn: 'root'
})

export class ChatApiService {
  private readonly backendBaseUrl: string = 'https://pia-bot.onrender.com'; // URL base do backend

  private readonly chatApiUrl: string = `${this.backendBaseUrl}/api/chat`;

  constructor(private http: HttpClient) { }

  // NOVO MÉTODO DE AQUECIMENTO
  wakeUpServer(): Observable<any> {
    // Faz uma chamada para a rota raiz do backend, que é leve e rápida
    return this.http.get(this.backendBaseUrl, { responseType: 'text' });
  }

  sendMessage(userId: string, message: string, temperature: number): Observable<ChatResponse> {
    const body = { userId, message, piabot_temperature: temperature };
    return this.http.post<ChatResponse>(this.chatApiUrl, body);
  }

  // NOVO MÉTODO PARA O FEED DE MENSAGENS
  getMessagesFeed(): Observable<MessageFeedItem[]> {
    return this.http.get<MessageFeedItem[]>(`${this.chatApiUrl}/messages`);
  }

}

