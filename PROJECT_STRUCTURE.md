# Cupid Project Structure Quick Reference

## 📁 Directory Overview

```
cupid/
├── 📄 Core Application Files
│   ├── app.py              # Flask routes & main application
│   ├── utils.py            # AI agents (Agent, Dating, Matching)
│   ├── Database.py         # MongoDB connection
│   ├── socket_events.py    # WebSocket handlers
│   └── requirements.txt    # Dependencies
│
├── 🌐 Frontend (website/)
│   ├── *.html              # Page templates
│   └── static/
│       ├── *.css           # Stylesheets
│       ├── *.js            # Client JavaScript
│       └── avatars/        # User avatars
│
├── 🔬 Research (experiments/)
│   ├── baseline_models.py           # ML baselines
│   ├── comprehensive_comparison.py  # LLM vs ML
│   └── EXPERIMENTS_README.md        # Research docs
│
└── 📚 Documentation
    ├── README.md                      # Setup guide
    ├── DEVELOPMENT_LOG.md             # Comprehensive dev log
    ├── Development Diary.md           # Original dev log (Chinese)
    ├── AI_DESIGN_EXPLANATION.md       # AI architecture
    ├── STAGE2_IMPLEMENTATION_COMPLETE.md
    ├── SANDBOX_DISPLAY_FLOW.md
    ├── API_KEY_MIGRATION.md
    └── SECURITY_SETUP.md
```

## 🔑 Key Files Explained

### Backend Core

| File | Purpose |
|------|---------|
| `app.py` | Flask app, all HTTP routes, session management |
| `utils.py` | AI agent classes: Agent, Dating, Matching |
| `Database.py` | MongoDB client wrapper |
| `socket_events.py` | Real-time WebSocket events (chat, sandbox) |

### Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Main dashboard |
| Login/Register | `/login_register` | Authentication |
| Chat | `/users` | User-to-user messaging |
| Discovery | `/discovery` | Find & match users |
| Sandbox | `/sandbox` | AI avatar simulation |
| Report | `/report` | Compatibility reports |
| Profile | `/user_profile` | View profile |
| Settings | `/user_settings` | Edit profile |

### Research Files

| File | Purpose |
|------|---------|
| `baseline_models.py` | Train ML models (Logistic Regression, RF, XGBoost) |
| `comprehensive_comparison.py` | Compare LLM vs ML predictions |
| `EXPERIMENTS_README.md` | Research methodology & usage |

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────┐
│   Frontend (HTML/CSS/JS)            │
│   - User Interface                  │
│   - WebSocket Client                │
└──────────────┬──────────────────────┘
               │ HTTP/WebSocket
┌──────────────▼──────────────────────┐
│   Flask Application (app.py)         │
│   - Routes                           │
│   - Session Management              │
│   - Request Handling                │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────┐    ┌───────▼────────┐
│  AI Agents │    │   Database      │
│  (utils.py)│    │  (Database.py)  │
│            │    │                 │
│ - Agent    │    │ - MongoDB       │
│ - Dating   │    │ - Redis         │
│ - Matching │    │                 │
└────────────┘    └─────────────────┘
```

## 🔄 Data Flow Examples

### Matching Simulation
```
User Request → app.py:/matching
    ↓
Matching.simulation()
    ↓
Create Agents (Male, Female, Host)
    ↓
Host generates scenario
    ↓
Agent makes decision
    ↓
Host evaluates & updates score
    ↓
Store in MongoDB
    ↓
Return result
```

### Chat Message
```
User sends message → WebSocket
    ↓
socket_events.py:handle_message()
    ↓
Save to MongoDB (chat-history)
    ↓
Emit to receiver via WebSocket
    ↓
Frontend displays message
```

## 🗄️ Database Collections

| Collection | Purpose |
|------------|---------|
| `Users` | User accounts & profiles |
| `chat-history` | Conversation messages |
| `report` | Compatibility reports |
| `matching-list` | Matching results |
| `invitation-code` | Registration codes |

## 🔌 API Endpoints Quick Reference

### Authentication
- `POST /login` - User login
- `POST /register` - User registration
- `GET /logout` - Logout

### User Management
- `GET /get_user_info` - Get current user
- `POST /update_user_info` - Update profile

### Chat & Discovery
- `POST /users/get-list` - Get available users
- `POST /users/load_history` - Load chat history
- `POST /users/dating` - Start dating simulation

### Matching
- `POST /matching` - Run compatibility matching
- `POST /users/get-matching-list` - Get matches
- `POST /report/get-report` - Get compatibility report

### Sandbox
- `POST /sandbox/create_avatar` - Create avatar
- `POST /sandbox/matching` - Run sandbox simulation
- WebSocket: `start_sandbox_simulation` - Real-time simulation

## 🎯 Key Classes & Methods

### Agent (utils.py)
```python
Agent(instruction, name, model)
  - sendMessage(content) → response
```

### Dating (utils.py)
```python
Dating(female_agent, male_agent)
  - startDating() → (female_rating, male_rating, messages)
  - evaluate() → (female_eval, male_eval)
```

### Matching (utils.py)
```python
Matching(female_id, male_id)
  - simulation() → (simulation_result, cumulative_rate)
  - emit_progress(event, data) → void
```

## 🔐 Environment Variables

Required in `.env`:
```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

## 🚀 Quick Start Commands

```bash
# Setup
conda create -n cupidAgent python=3.13.2
conda activate cupidAgent
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run Redis (for sessions)
redis-server

# Run Application
python app.py
# Access at http://localhost:5001
```

## 📊 Key Metrics

- **Compatibility Score**: 0-50 (starts at 25)
- **Max Matching Rounds**: 10 iterations
- **Session Timeout**: 36000 seconds (10 hours)
- **Port**: 5001

## 🔍 Where to Find Things

| Need to... | Look in... |
|------------|-----------|
| Add a new route | `app.py` |
| Modify AI behavior | `utils.py` |
| Change database queries | `Database.py` |
| Add WebSocket events | `socket_events.py` |
| Update UI | `website/static/*.css` or `*.js` |
| Add a new page | `website/*.html` |
| Run experiments | `experiments/` |
| Understand AI design | `AI_DESIGN_EXPLANATION.md` |
| Track development | `DEVELOPMENT_LOG.md` |

---

**Last Updated**: 2025-01-XX  
**Quick Reference Version**: 1.0

