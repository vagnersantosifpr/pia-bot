import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Crie um novo tipo para o payload de atualização
// Este tipo inclui campos gerais que podem ser atualizados
// E também os campos específicos para a alteração de senha
export type UserUpdatePayload = {
    name?: string;
    role?: 'admin' | 'viewer'; // Opcional, apenas para admins que mudam o role de outros

    // Campos específicos para alteração de senha
    currentPassword?: string;
    newPassword?: string;
};

export interface AIModel {
    _id: string;
    name: string;
    modelId: string;
    isActive: boolean;
    isDefault: boolean;
    description?: string;
}

// NOVA INTERFACE PARA A MENSAGEM DO FEED
export interface MessageFeedItem {
    _id: string;
    userId: string;
    role: 'user' | 'model';
    text: string;
    timestamp: string;
}



// (Defina as interfaces para os dados aqui para ter um código mais tipado e seguro)
export interface ConversationSnippet {
    _id: string;
    userId: string;
    createdAt: string;
    messages: [{ text: string }];
}

// NOVA INTERFACE PARA O MODELO DE USUÁRIO
export interface User {
    _id: string;
    email: string;
    name: string;
    role: 'admin' | 'viewer'; // Ou os roles que você usa
    createdAt: string;
    // Não inclua 'password' aqui para segurança
}

export interface KnowledgeItem {
    _id: string;
    topic: string;
    content: string;
    source: string;
}

// ... outras interfaces

@Injectable({
    providedIn: 'root'
})
export class AdminApiService {
    //    private apiUrl = 'http://localhost:3000/api/admin'; // Ou URL de produção
    private readonly apiUrl = 'https://pia-bot.onrender.com/api/admin';

    constructor(private http: HttpClient) { }

    // --- NOVOS MÉTODOS DE USUÁRIO ---
    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/users`);
    }

    createUser(userData: { email: string; password: string; name: string; role: string }): Observable<User> {
        return this.http.post<User>(`${this.apiUrl}/users`, userData);
    }

    updateUser(id: string, updateData: UserUpdatePayload): Observable<User> {
        return this.http.put<User>(`${this.apiUrl}/users/${id}`, updateData);
    }

    deleteUser(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/users/${id}`);
    }

    // --- Métodos de Conversa ---
    getConversationSnippets(): Observable<ConversationSnippet[]> {
        return this.http.get<ConversationSnippet[]>(`${this.apiUrl}/conversations`);
    }

    getConversationById(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/conversations/${id}`);
    }

    // MODIFICADO: Aceita um termo de busca opcional
    // MÉTODO CORRIGIDO
    getKnowledgeBase(searchTerm: string = ''): Observable<KnowledgeItem[]> {
        const url = `${this.apiUrl}/knowledge`;
        let params = new HttpParams();

        // Se houver um termo de busca, adicione-o como parâmetro 'q'
        if (searchTerm) {
            params = params.set('q', searchTerm);
        }

        // Passe o objeto de opções com os parâmetros para a requisição GET
        return this.http.get<KnowledgeItem[]>(url, { params: params });
    }

    // NOVO MÉTODO: Para atualizar um item
    updateKnowledgeItem(id: string, itemData: { source: string; topic: string; content: string }): Observable<KnowledgeItem> {
        return this.http.put<KnowledgeItem>(`${this.apiUrl}/knowledge/${id}`, itemData);
    }

    deleteKnowledgeItem(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/knowledge/${id}`);
    }
    // --- ADICIONE O MÉTODO FALTANTE AQUI ---
    createKnowledgeItem(item: { source: string; topic: string; content: string }): Observable<KnowledgeItem> {
        return this.http.post<KnowledgeItem>(`${this.apiUrl}/knowledge`, item);
    }

    // NOVO MÉTODO PARA O FEED DE MENSAGENS
    getMessagesFeed(): Observable<MessageFeedItem[]> {
        return this.http.get<MessageFeedItem[]>(`${this.apiUrl}/messages`);
    }


    // --- Métodos de Usuário (a serem implementados depois) ---
    // getUsers(): Observable<any[]> { ... }
    // createUser(user: any): Observable<any> { ... }

    // --- Métodos de Modelos de IA ---
    getAIModels(): Observable<AIModel[]> {
        return this.http.get<AIModel[]>(`${this.apiUrl}/models`);
    }

    updateAIModel(id: string, data: Partial<AIModel>): Observable<AIModel> {
        return this.http.put<AIModel>(`${this.apiUrl}/models/${id}`, data);
    }

    createAIModel(data: Partial<AIModel>): Observable<AIModel> {
        return this.http.post<AIModel>(`${this.apiUrl}/models`, data);
    }

}