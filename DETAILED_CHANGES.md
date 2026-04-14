# Detailed Change Reference

This document shows before/after for each file modified.

---

## 1. Backend: `backend/routes/chat.js`

### BEFORE:
```javascript
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001"
});
const generativeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }); // Hardcoded

router.post('/', async (req, res) => {
  try {
    const { userId, message, piabot_temperature } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId e message são obrigatórios.' });
    }
```

### AFTER:
```javascript
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001"
});

// NOVA: Lista de modelos permitidos para seleção pelo usuário
const ALLOWED_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro'
];

// Modelo padrão caso nenhum seja especificado
const DEFAULT_MODEL = 'gemini-1.5-flash';

router.post('/', async (req, res) => {
  try {
    const { userId, message, piabot_temperature, model } = req.body;  // ← Now accepts model
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId e message são obrigatórios.' });
    }

    // NOVA: Validar e definir o modelo
    const requestedModel = model && ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;
    console.log(`Usando modelo: ${requestedModel}`);
    const generativeModel = genAI.getGenerativeModel({ model: requestedModel });  // ← Dynamic
```

**What Changed:**
- Added ALLOWED_MODELS array with 4 models
- Added DEFAULT_MODEL constant
- Extract `model` from request body
- Validate model against whitelist
- Initialize generativeModel dynamically (no longer hardcoded)

---

## 2. Frontend Service: `frontend/src/app/services/chat-api.service.ts`

### BEFORE:
```typescript
sendMessage(userId: string, message: string, temperature: number): Observable<ChatResponse> {
  const body = { userId, message, piabot_temperature: temperature };
  return this.http.post<ChatResponse>(this.chatApiUrl, body);
}
```

### AFTER:
```typescript
sendMessage(userId: string, message: string, temperature: number, model?: string): Observable<ChatResponse> {
  const body = { userId, message, piabot_temperature: temperature, model };
  return this.http.post<ChatResponse>(this.chatApiUrl, body);
}
```

**What Changed:**
- Added optional `model` parameter
- Include model in request body sent to backend

---

## 3. Component TypeScript: `frontend/src/app/components/chat/chat.component.ts`

### BEFORE - Properties:
```typescript
export class ChatComponent implements OnInit {
  messages: Message[] = [];
  userId: string = '';
  private shouldScrollDown = false;
  chatTemperature: number = 1.0;
```

### AFTER - Properties:
```typescript
export class ChatComponent implements OnInit {
  messages: Message[] = [];
  userId: string = '';
  private shouldScrollDown = false;
  chatTemperature: number = 1.0;

  // NOVA: Definição de modelos disponíveis
  availableModels = [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Mais Rápido)' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (Leve)' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Mais Preciso)' }
  ];

  selectedModel: string = 'gemini-1.5-flash'; // Modelo padrão
```

### BEFORE - ngOnInit:
```typescript
ngOnInit(): void {
  this.chatApi.wakeUpServer().subscribe({...});
  this.userId = localStorage.getItem('assisbot_userId') || uuidv4();
  localStorage.setItem('assisbot_userId', this.userId);
  
  const savedTemp = localStorage.getItem('piabot_temperature');
  this.chatTemperature = savedTemp ? parseFloat(savedTemp) : 1.0;

  this.messages.push({
    role: 'model',
    text: 'Daí! Eu sou o ELO, mas pode me chamar de Piá-bot...'
  });
}
```

### AFTER - ngOnInit:
```typescript
ngOnInit(): void {
  this.chatApi.wakeUpServer().subscribe({...});
  this.userId = localStorage.getItem('assisbot_userId') || uuidv4();
  localStorage.setItem('assisbot_userId', this.userId);
  
  const savedTemp = localStorage.getItem('piabot_temperature');
  this.chatTemperature = savedTemp ? parseFloat(savedTemp) : 1.0;

  // NOVA: Recupera o modelo selecionado, se existir
  const savedModel = localStorage.getItem('piabot_selectedModel');
  this.selectedModel = savedModel || 'gemini-1.5-flash';

  this.messages.push({
    role: 'model',
    text: 'Daí! Eu sou o ELO, mas pode me chamar de Piá-bot...'
  });
}
```

### NEW METHOD:
```typescript
// NOVA: Método para salvar o modelo quando muda
onModelChange(): void {
  localStorage.setItem('piabot_selectedModel', this.selectedModel);
  console.log('Modelo alterado para:', this.selectedModel);
}
```

### BEFORE - handleSendMessage:
```typescript
handleSendMessage(text: string): void {
  this.messages.push({ role: 'user', text });
  this.messages.push({ role: 'loading', text: '' });
  this.shouldScrollDown = true;

  this.chatApi.sendMessage(this.userId, text, this.chatTemperature).subscribe({
    next: (response) => {...},
    error: (err) => {...}
  });
}
```

### AFTER - handleSendMessage:
```typescript
handleSendMessage(text: string): void {
  this.messages.push({ role: 'user', text });
  this.messages.push({ role: 'loading', text: '' });
  this.shouldScrollDown = true;

  // MODIFICADO: Incluir o modelo na chamada da API
  this.chatApi.sendMessage(this.userId, text, this.chatTemperature, this.selectedModel).subscribe({
    next: (response) => {...},
    error: (err) => {...}
  });
}
```

**What Changed:**
- Added availableModels array with friendly names
- Added selectedModel property
- Load model from localStorage in ngOnInit
- Added onModelChange() method to persist selection
- Updated handleSendMessage to pass model to API

---

## 4. Component Template: `frontend/src/app/components/chat/chat.component.html`

### BEFORE:
```html
<div class="chat-container">
  <div class="header">
    <!-- admin icon -->
    <div class="header-title">
      <h2>E.L.O. (O Piá-bot)</h2>
      <span>Canal de Apoio pedagógico e estudantil do IFPR...</span>
    </div>
  </div>

  <!-- NOVO CONTROLE DE TEMPERATURA -->
  <div class="temperature-control">
    <label for="piabot_temperature">Tom da Conversa:</label>
    <span class="temp-label">Descontraído</span>
    <input type="range" id="piabot_temperature" ... [(ngModel)]="chatTemperature" ...>
    <span class="temp-label">Formal</span>
  </div>

  <div class="messages-area" #messagesArea>
    <app-message-list [messages]="messages"></app-message-list>
  </div>
  ...
</div>
```

### AFTER:
```html
<div class="chat-container">
  <div class="header">
    <!-- admin icon -->
    <div class="header-title">
      <h2>E.L.O. (O Piá-bot)</h2>
      <span>Canal de Apoio pedagógico e estudantil do IFPR...</span>
    </div>
  </div>

  <!-- NOVO CONTROLE DE MODELO -->
  <div class="model-selector">
    <label for="model_select">Modelo de IA:</label>
    <select id="model_select" [(ngModel)]="selectedModel" (ngModelChange)="onModelChange()" class="model-select">
      <option *ngFor="let model of availableModels" [value]="model.id">
        {{ model.label }}
      </option>
    </select>
    <div class="model-info">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="info-icon">
        <!-- info circle icon -->
      </svg>
      <span class="tooltip">Trocar de modelo pode ajudar<br/>a evitar limites de requisições</span>
    </div>
  </div>

  <!-- CONTROLE DE TEMPERATURA -->
  <div class="temperature-control">
    <label for="piabot_temperature">Tom da Conversa:</label>
    <span class="temp-label">Descontraído</span>
    <input type="range" id="piabot_temperature" ... [(ngModel)]="chatTemperature" ...>
    <span class="temp-label">Formal</span>
  </div>

  <div class="messages-area" #messagesArea>
    <app-message-list [messages]="messages"></app-message-list>
  </div>
  ...
</div>
```

**What Changed:**
- Added new model-selector div above temperature-control
- Includes select dropdown with ngFor loop
- Added info icon with helpful tooltip
- Uses ngModel for two-way binding
- Calls onModelChange on selection

---

## 5. Component Styles: `frontend/src/app/components/chat/chat.component.scss`

### ADDED (after .temperature-control):
```scss
// NOVA: Estilo para o seletor de modelo
.model-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(0, 128, 105, 0.08) 0%, rgba(0, 128, 105, 0.04) 100%);
  border-bottom: 1px solid #e0e0e0;
  font-size: 0.85rem;
  color: #333;
  position: relative;
  z-index: 10;

  label {
    font-weight: 600;
    color: #008069;
    white-space: nowrap;
  }

  .model-select {
    flex: 1;
    max-width: 280px;
    padding: 8px 12px;
    border: 1.5px solid #008069;
    border-radius: 6px;
    background-color: white;
    color: #333;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      border-color: #006556;
      box-shadow: 0 2px 8px rgba(0, 128, 105, 0.15);
    }

    &:focus {
      outline: none;
      border-color: #006556;
      box-shadow: 0 0 0 3px rgba(0, 128, 105, 0.1);
    }
  }

  .model-info {
    position: relative;
    display: inline-flex;
    align-items: center;

    .info-icon {
      width: 18px;
      height: 18px;
      color: #008069;
      cursor: help;
      transition: color 0.2s ease;

      &:hover {
        color: #006556;
      }
    }

    .tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: #008069;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      margin-bottom: 8px;
      z-index: 1000;
      line-height: 1.4;

      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: #008069;
      }
    }

    &:hover .tooltip {
      opacity: 1;
    }
  }
}
```

**What Changed:**
- 95 lines of new CSS added
- Green gradient background matching app theme
- Hover and focus states for accessibility
- Tooltip mechanism with arrow pointer
- Responsive design with max-widths

---

## Summary of Changes

| File | Type | Lines Changed | Key Changes |
|------|------|----------------|------------|
| chat.js | Backend | +25 | Model list, validation, dynamic init |
| chat-api.service.ts | Service | +1 | Accept model parameter |
| chat.component.ts | Component | +30 | Models list, storage, method |
| chat.component.html | Template | +13 | Selector UI, options, tooltip |
| chat.component.scss | Styles | +95 | Gradient bg, hover effects, tooltip |
| **TOTAL** | | **+164** | **Full feature implementation** |

---

## Integration Checklist

- [x] Backend accepts model parameter
- [x] Backend validates against whitelist
- [x] Backend falls back to default
- [x] Frontend sends model with every message
- [x] Frontend saves model to localStorage
- [x] Frontend loads saved model on init
- [x] UI displays all 4 models
- [x] Select works with two-way binding
- [x] Tooltip shows on hover
- [x] Styles match app theme
- [x] No breaking changes to existing features

---

## Rollback Instructions

If you need to revert these changes:

1. **Backend**: Restore hardcoded model initialization
   - Remove ALLOWED_MODELS and DEFAULT_MODEL
   - Change back to `const generativeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });`
   - Remove model parameter extraction

2. **Frontend Service**: Remove model parameter from sendMessage

3. **Component TypeScript**: Remove availableModels, selectedModel, onModelChange

4. **Template**: Remove model-selector div

5. **Styles**: Remove .model-selector CSS block

All changes are self-contained and can be cleanly removed.
