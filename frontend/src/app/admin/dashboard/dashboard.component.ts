import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { AdminApiService, ConversationSnippet, KnowledgeItem, User, AIModel } from '../admin-api.service';
import { AuthService } from '../auth.service';
import { MessageFeedItem } from '../../services/chat-api.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  activeTab: 'history' | 'feed' | 'knowledge' | 'users' | 'models' = 'history';

  userName: string = '';
  userRole: 'admin' | 'viewer' = 'viewer'; // Para controlar permissões

  conversations: ConversationSnippet[] = [];
  knowledgeBase: KnowledgeItem[] = [];
  isLoading: boolean = true; // Adiciona uma flag de carregamento
  error: string | null = null;   // Para exibir mensagens de erro

  users: User[] = []; // Nova propriedade para armazenar usuários
  messagesFeed: MessageFeedItem[] = []; // NOVA PROPRIEDADE

  aiModels: AIModel[] = [];

  // Propriedades para criação de novos modelos
  newAIModel = { name: '', modelId: '', description: '', isActive: true, isDefault: false };
  isModelSubmitting = false;

  // Propriedades para o formulário de alteração de senha
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  passwordChangeMessage: string | null = null;
  passwordChangeError: string | null = null;

  // Propriedades para o formulário de criação de usuário (apenas admin)
  newUser = { email: '', password: '', name: '', role: 'viewer' };
  newUserMessage: string | null = null;
  newUserError: string | null = null;

  // 3. NOVAS PROPRIEDADES PARA O FORMULÁRIO
  newKnowledgeItem = { topic: '', source: '', content: '' };
  isSubmitting = false;
  formError: string | null = null;

  // NOVAS PROPRIEDADES
  searchTerm: string = '';
  editingItem: KnowledgeItem | null = null;

  // NOVO: FormControl para a barra de busca
  searchControl = new FormControl('');
  private destroy$ = new Subject<void>(); // Para gerenciar a subscrição

  selectedConversation: any = null;

  constructor(
    private adminApi: AdminApiService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const userRaw = localStorage.getItem('authUser');
    console.log('ngOnInit - userRaw do localStorage:', userRaw); // DEBUG 1

    const user = userRaw ? JSON.parse(userRaw) : {};
    console.log('ngOnInit - Objeto user PARSEADO:', user); // DEBUG 2

    this.userName = user.name || 'Admin';
    this.userRole = user.role || 'viewer';

    this.loadInitialData();
    if (this.userRole === 'admin') { // Carrega usuários apenas se for admin
      this.loadUsers();
      this.loadAIModels();
    }

    this.loadConversations();
    // Carregue os outros dados também
    this.loadKnowledgeBase();

    this.setupSearch(); // Configura a busca reativa


  }

  ngOnDestroy(): void {
    // Limpa a subscrição para evitar vazamentos de memória
    this.destroy$.next();
    this.destroy$.complete();
  }

   // NOVO MÉTODO: Configura a busca com debounce
  setupSearch(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300), // Espera 300ms após o usuário parar de digitar
      distinctUntilChanged(), // Só emite se o valor realmente mudou
      takeUntil(this.destroy$) // Cancela a subscrição quando o componente é destruído
    ).subscribe(searchTerm => {
      this.loadKnowledgeBase(searchTerm || ''); // Chama a busca com o novo termo
    });
  }

  loadKnowledgeBase(searchTerm: string = ''): void { // Modificado para aceitar o termo
    console.log(`Buscando base de conhecimento com o termo: "${searchTerm}"`);
    this.adminApi.getKnowledgeBase(searchTerm).subscribe({
      next: (data) => {
        this.knowledgeBase = data;
        console.log("Base de conhecimento carregada:", data);
      },
      error: (err) => console.error("Erro ao buscar base de conhecimento:", err)
    });
  }

  loadConversations(): void {
    this.isLoading = true;
    this.error = null;
    console.log("Buscando histórico de conversas..."); // Log de depuração

    this.adminApi.getConversationSnippets().subscribe({
      next: (data) => {
        this.conversations = data;
        this.isLoading = false;
        console.log("Conversas carregadas com sucesso:", data); // Log de sucesso
      },
      error: (err) => {
        this.error = "Falha ao carregar o histórico de conversas.";
        this.isLoading = false;
        console.error("Erro ao buscar conversas:", err); // Log de erro
      }
    });
  }

  loadKnowledgeBase1(): void {
    console.log("Buscando base de conhecimento..."); // Log de depuração

    this.adminApi.getKnowledgeBase(this.searchTerm).subscribe({
      next: (data) => {
        this.knowledgeBase = data;
        console.log("Base de conhecimento carregada com sucesso:", data); // Log de sucesso
      },
      error: (err) => {
        console.error("Erro ao buscar base de conhecimento:", err); // Log de erro
        // Opcional: setar uma variável de erro para exibir na tela
      }
    });
  }

  // NOVO MÉTODO: Chamado a cada letra digitada no campo de busca
  onSearch(): void {
    this.loadKnowledgeBase();
  }

  // NOVO MÉTODO: Abre o modal de edição
  openEditModal(item: KnowledgeItem): void {
    // Cria uma cópia do item para não modificar a lista diretamente
    this.editingItem = { ...item };
  }

  // NOVO MÉTODO: Salva as alterações
  onUpdateKnowledgeSubmit(): void {
    if (!this.editingItem) return;

    this.isSubmitting = true;
    const { _id, topic, source, content } = this.editingItem;

    this.adminApi.updateKnowledgeItem(_id, { topic, source, content }).subscribe({
      next: (updatedItem) => {
        // Atualiza o item na lista do frontend
        const index = this.knowledgeBase.findIndex(item => item._id === _id);
        if (index !== -1) {
          this.knowledgeBase[index] = updatedItem;
        }
        this.editingItem = null; // Fecha o modal
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error("Erro ao atualizar item:", err);
        this.isSubmitting = false;
        // Adicionar feedback de erro para o usuário
      }
    });
  }

  deleteKnowledgeItem(id: string): void {
    if (confirm('Tem certeza que deseja excluir este item da base de conhecimento? Esta ação não pode ser desfeita.')) {
      this.adminApi.deleteKnowledgeItem(id).subscribe({
        next: () => {
          // Recarrega a lista após a exclusão
          this.knowledgeBase = this.knowledgeBase.filter(item => item._id !== id);
          console.log(`Item ${id} deletado com sucesso.`);
        },
        error: (err) => {
          console.error(`Erro ao deletar item ${id}:`, err);
          alert('Ocorreu um erro ao excluir o item.');
        }
      });
    }
  }

  loadInitialData(): void {
    this.adminApi.getConversationSnippets().subscribe(data => this.conversations = data);
    this.adminApi.getKnowledgeBase().subscribe(data => this.knowledgeBase = data);
    this.adminApi.getMessagesFeed().subscribe(data => this.messagesFeed = data); // Carrega o feed

  }

  loadAIModels(): void {
    this.adminApi.getAIModels().subscribe({
      next: data => this.aiModels = data,
      error: err => console.error('Erro ao carregar modelos:', err)
    });
  }

  toggleModelStatus(model: AIModel): void {
    const newStatus = !model.isActive;
    this.adminApi.updateAIModel(model._id, { isActive: newStatus }).subscribe({
      next: (updated) => {
        model.isActive = updated.isActive;
      },
      error: (err) => {
        alert('Erro ao alterar status do modelo.');
        console.error(err);
      }
    });
  }

  onAddModelSubmit(): void {
    if (!this.newAIModel.name || !this.newAIModel.modelId) {
      alert('Nome e ID Técnico são obrigatórios.');
      return;
    }
    this.isModelSubmitting = true;
    this.adminApi.createAIModel(this.newAIModel).subscribe({
      next: (model) => {
        this.aiModels.push(model);
        this.newAIModel = { name: '', modelId: '', description: '', isActive: true, isDefault: false };
        this.isModelSubmitting = false;
      },
      error: (err) => {
        alert('Erro ao criar modelo.');
        this.isModelSubmitting = false;
      }
    });
  }

  deleteAIModel(id: string): void {
    if (confirm('Deseja realmente remover este modelo?')) {
      this.adminApi.deleteAIModel(id).subscribe({
        next: () => this.aiModels = this.aiModels.filter(m => m._id !== id),
        error: (err) => alert('Erro ao remover modelo.')
      });
    }
  }

  setDefaultModel(model: AIModel): void {
    this.adminApi.updateAIModel(model._id, { isDefault: true }).subscribe({
      next: () => {
        this.loadAIModels(); // Recarrega para atualizar os badges de 'Padrão'
      },
      error: (err) => {
        alert('Erro ao definir modelo padrão.');
        console.error(err);
      }
    });
  }

  loadUsers(): void {
    this.adminApi.getUsers().subscribe({
      next: data => this.users = data,
      error: err => console.error('Erro ao carregar usuários:', err)
    });
  }

  setActiveTab(tab: 'history' | 'feed' | 'knowledge' | 'users' | 'models'): void {
    this.activeTab = tab;
  }

  logout(): void {
    this.authService.logout();
  }

  viewConversation(id: string): void {
    this.adminApi.getConversationById(id).subscribe(data => {
      this.selectedConversation = data;
    });
  }


  // 4. NOVO MÉTODO PARA O SUBMIT DO FORMULÁRIO
  onAddKnowledgeSubmit(): void {
    this.isSubmitting = true;
    this.formError = null;

    this.adminApi.createKnowledgeItem(this.newKnowledgeItem).subscribe({
      next: (newItem: KnowledgeItem) => {
        // Adiciona o novo item no topo da lista, sem precisar recarregar a página
        this.knowledgeBase.unshift(newItem);
        // Limpa o formulário
        this.newKnowledgeItem = { topic: '', source: '', content: '' };
        this.isSubmitting = false;
      },
      error: (err: any) => {
        this.formError = 'Ocorreu um erro ao adicionar o item. Tente novamente.';
        this.isSubmitting = false;
        console.error('Erro ao criar item de conhecimento:', err);
      }
    });
  }

  // --- NOVOS MÉTODOS PARA GERENCIAMENTO DE USUÁRIOS ---
  onPasswordChangeSubmit(): void {
    this.passwordChangeMessage = null;
    this.passwordChangeError = null;

    // DEBUG 3: O que está no localStorage antes de tentar mudar a senha?
    const authUserFromStorage = localStorage.getItem('authUser');
    console.log('onPasswordChangeSubmit - authUser do localStorage (string):', authUserFromStorage);

    // DEBUG 4: Como o objeto está sendo parseado?
    const loggedInUser = JSON.parse(authUserFromStorage || '{}');
    console.log('onPasswordChangeSubmit - loggedInUser (objeto parseado):', loggedInUser);

    // DEBUG 5: Qual o valor de userId?
    const userId = loggedInUser._id;
    console.log('onPasswordChangeSubmit - userId extraído:', userId);


    if (!userId) {
      this.passwordChangeError = 'Erro: ID do usuário logado não encontrado.';
      console.error('Falha na extração do userId. loggedInUser:', loggedInUser); // DEBUG 6
      return;
    }



    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordChangeError = 'A nova senha e a confirmação não coincidem.';
      return;
    }

    if (!this.currentPassword || !this.newPassword) {
      this.passwordChangeError = 'Todos os campos de senha são obrigatórios.';
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordChangeError = 'A nova senha e a confirmação não coincidem.';
      return;
    }

    if (!this.currentPassword || !this.newPassword) {
      this.passwordChangeError = 'Todos os campos de senha são obrigatórios.';
      return;
    }
    // Chamada à API para alterar a senha.
    // O backend precisará de um endpoint PUT /api/admin/users/:id que aceite { currentPassword, newPassword }
    this.adminApi.updateUser(userId, { currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.passwordChangeMessage = 'Senha alterada com sucesso!';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
      },
      error: (err) => {
        this.passwordChangeError = err.error.error || 'Falha ao alterar senha.';
        console.error('Erro ao alterar senha:', err);
      }
    });
  }

  onNewUserSubmit(): void {
    this.newUserMessage = null;
    this.newUserError = null;

    if (!this.newUser.email || !this.newUser.password || !this.newUser.name || !this.newUser.role) {
      this.newUserError = 'Todos os campos são obrigatórios.';
      return;
    }

    this.adminApi.createUser(this.newUser).subscribe({
      next: (user) => {
        this.newUserMessage = 'Usuário criado com sucesso!';
        this.users.push(user); // Adiciona na lista
        this.newUser = { email: '', password: '', name: '', role: 'viewer' }; // Limpa form
      },
      error: (err) => {
        this.newUserError = err.error.error || 'Falha ao criar usuário.';
        console.error('Erro ao criar usuário:', err);
      }
    });
  }

  deleteUser(id: string): void {
    if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      this.adminApi.deleteUser(id).subscribe({
        next: () => {
          this.users = this.users.filter(user => user._id !== id);
          console.log(`Usuário ${id} deletado com sucesso.`);
        },
        error: (err) => {
          console.error(`Erro ao deletar usuário ${id}:`, err);
          alert('Ocorreu um erro ao excluir o usuário.');
        }
      });
    }
  }

}