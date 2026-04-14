# Quick Reference Guide - Multi-Model Selection

## 🎯 Feature Summary
Users can now select from 4 Gemini models in the chat interface to manage API quota limits.

## 🛠️ Technical Stack
- **Backend**: Node.js/Express + Google Generative AI SDK
- **Frontend**: Angular + TypeScript + SCSS
- **Storage**: Browser localStorage
- **API**: RESTful POST to /api/chat

---

## 📋 Quick Start for Testers

### 1. Access the Feature
- Open the chat interface
- Look for "Modelo de IA:" dropdown below the admin icon
- You should see 4 models available

### 2. Test Basic Functionality
```
a) Select "Gemini 2.0 Flash"
b) Send a message
c) Check console (F12 → Console) for: "Modelo alterado para: gemini-2.0-flash"
d) Refresh the page
e) Verify the same model is still selected
```

### 3. Test API Integration
```
a) Open DevTools (F12)
b) Go to Network tab
c) Send a chat message
d) Click on the POST request to /api/chat
e) Under "Request" tab, verify body includes: "model": "gemini-2.0-flash"
```

### 4. Test Backend Logging
```
Keep backend logs open and watch for:
"Usando modelo: gemini-2.0-flash"
```

---

## 📁 File Quick Reference

### Backend
**File**: `backend/routes/chat.js`
**Key Lines**: 15-24 (Config), 96-98 (Validation)
**What to Check**: Model validation, fallback behavior

### Frontend Service
**File**: `frontend/src/app/services/chat-api.service.ts`
**Key Line**: 31 (Updated sendMessage signature)
**What to Check**: Model is passed in request body

### Frontend Component
**File**: `frontend/src/app/components/chat/chat.component.ts`
**Key Areas**: 
- Lines 32-40: Models definition
- Line 40: selectedModel property
- Lines 62-63: Load from localStorage
- Lines 78-80: onModelChange method
- Line 99: Pass model to API

### Frontend Template
**File**: `frontend/src/app/components/chat/chat.component.html`
**Key Section**: Lines 1-15 (New model-selector div)

### Frontend Styles
**File**: `frontend/src/app/components/chat/chat.component.scss`
**Key Section**: Lines 104-195 (.model-selector class)

---

## 🔑 Key Constants

```javascript
// Backend - Allowed models
const ALLOWED_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro'
];

const DEFAULT_MODEL = 'gemini-1.5-flash';
```

```typescript
// Frontend - Model display
availableModels = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Mais Rápido)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (Leve)' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Mais Preciso)' }
];
```

---

## 💾 Storage Keys

| Key | Purpose | Example Value |
|-----|---------|---|
| `piabot_selectedModel` | Selected model ID | "gemini-2.0-flash" |
| `piabot_temperature` | Conversa tone | "0.5" |
| `assisbot_userId` | User identifier | "uuid" |

---

## 🔄 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    USER SELECTS MODEL                        │
│                   (Dropdown changes)                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
         ┌───────────▼──────────────┐
         │  onModelChange() called  │
         └───────────┬──────────────┘
                     │
         ┌───────────▼─────────────────────────┐
         │  Save to localStorage               │
         │  Key: 'piabot_selectedModel'        │
         └───────────┬──────────────────────────┘
                     │
         ┌───────────▼──────────────┐
         │  selectedModel updated   │
         └───────────┬──────────────┘
                     │
         ┌───────────▼──────────────┐
         │  USER SENDS MESSAGE      │
         └───────────┬──────────────┘
                     │
         ┌───────────▼──────────────────────────────────┐
         │  handleSendMessage() passes selectedModel    │
         │  to chatApi.sendMessage()                    │
         └───────────┬──────────────────────────────────┘
                     │
         ┌───────────▼──────────────────────┐
         │  HTTP POST to /api/chat          │
         │  Body includes: model field      │
         └───────────┬──────────────────────┘
                     │
         ┌───────────▼──────────────────────────────┐
         │  BACKEND RECEIVES REQUEST                │
         │  Extracts model from body                │
         └───────────┬──────────────────────────────┘
                     │
         ┌───────────▼──────────────────────────────┐
         │  Validate model in ALLOWED_MODELS        │
         │  If invalid → use DEFAULT_MODEL          │
         └───────────┬──────────────────────────────┘
                     │
         ┌───────────▼──────────────────────────────┐
         │  Initialize generativeModel dynamically  │
         │  genAI.getGenerativeModel({model: ...}) │
         └───────────┬──────────────────────────────┘
                     │
         ┌───────────▼──────────────────────────┐
         │  Generate response with selected     │
         │  model                               │
         └───────────┬──────────────────────────┘
                     │
         ┌───────────▼──────────────────────────┐
         │  Send response back to frontend      │
         └──────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Model selector not visible
- **Check**: CSS loaded correctly
- **Check**: Component has formsModule in imports
- **Fix**: Re-run `ng serve` or `npm start`

### Model not persisting after refresh
- **Check**: localStorage not disabled in browser
- **Check**: Browser's private/incognito mode
- **Fix**: Test in regular mode, check dev tools

### Backend not receiving model
- **Check**: Network tab shows model in request body
- **Check**: API key configured correctly
- **Fix**: Check backend logs for errors

### Tooltip not appearing
- **Check**: Hover over the ℹ️ icon (not just near it)
- **Check**: Browser zoom level normal (100%)
- **Fix**: Test in different browser

### Wrong model being used
- **Check**: Backend console shows logged model
- **Check**: Correct model ID sent from frontend
- **Fix**: Clear localStorage and select model again

---

## 🚀 Deployment Checklist

- [ ] Backend compiled without errors
- [ ] All environment variables configured
- [ ] Frontend built successfully (`ng build`)
- [ ] localStorage not cleared
- [ ] ALLOWED_MODELS list is current
- [ ] Default model is appropriate
- [ ] Tooltip text is helpful
- [ ] Styles match app branding
- [ ] Mobile responsive tested
- [ ] No console errors on load

---

## 📊 Monitoring

### Watch for these logs:

**Backend (every message):**
```
Usando modelo: gemini-2.0-flash
```

**Frontend (on selection change):**
```
Modelo alterado para: gemini-2.0-flash
```

### Success Indicators
- ✅ User can see all 4 models
- ✅ Model changes persist on refresh
- ✅ Messages work with any model
- ✅ No 500 errors from backend
- ✅ Response times similar between models

---

## 🔒 Security Notes

✅ **Backend validates all inputs**
- Only ALLOWED_MODELS accepted
- Invalid models → fallback to DEFAULT
- No arbitrary model injection possible

✅ **Frontend-only localStorage**
- No sensitive data stored
- Users can clear if needed
- No backend dependency

✅ **API Security**
- Same auth/rate limiting as before
- Model selection doesn't bypass protections
- Each model has its own quota

---

## 📞 Support Reference

| Issue | Contact |
|-------|---------|
| Model not working | Check backend logs |
| UI not rendering | Check CSS compiled |
| localStorage issues | Clear browser data |
| API errors | Check Google Cloud quota |

---

## Version Info

- **Feature Version**: 1.0
- **Last Updated**: April 14, 2026
- **Status**: Production Ready
- **Breaking Changes**: None

---

**Need more help?** See IMPLEMENTATION_SUMMARY.md for detailed documentation.
