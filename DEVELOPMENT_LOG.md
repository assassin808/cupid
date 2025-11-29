# Cupid Development Log

## 📋 Project Overview

**Cupid** is a Multi-LLM based dating application that simulates relationship compatibility through AI agents. The project implements a "Love First, Know Later" research concept, where AI agents with distinct personalities interact in simulated dating scenarios to predict compatibility.

### Core Concept
- **Three-Agent Architecture**: Dating Host (scenario generator), Male Agent, Female Agent
- **Compatibility Scoring**: 0-50 scale starting at 25 (neutral)
- **Scenario-Based Interactions**: Multiple-choice questions simulate real relationship decisions
- **Research Focus**: Compare LLM-based matching with traditional ML approaches

---

## 🏗️ Code Structure

### Backend Architecture

```
cupid/
├── app.py                 # Flask application & routes
├── utils.py              # Core AI agents (Agent, Dating, Matching)
├── Database.py           # MongoDB connection wrapper
├── socket_events.py      # WebSocket handlers for real-time updates
└── requirements.txt      # Python dependencies
```

### Frontend Structure

```
website/
├── home.html            # Main dashboard
├── login_register.html   # Authentication
├── chat.html            # User-to-user chat interface
├── discovery.html       # User discovery & matching
├── sandbox.html         # AI sandbox for avatar simulation
├── report.html          # Compatibility reports
├── user_profile.html    # User profile display
├── user_settings.html   # User settings & profile editing
└── static/
    ├── *.css            # Stylesheets
    ├── *.js             # Client-side JavaScript
    └── avatars/         # User-uploaded avatars
```

### Research Experiments

```
experiments/
├── baseline_models.py           # Traditional ML baselines
├── comprehensive_comparison.py  # LLM vs ML comparison
└── EXPERIMENTS_README.md        # Research documentation
```

---

## 🔑 Key Components

### 1. **Agent System** (`utils.py`)

#### `Agent` Class
- Wraps OpenAI API (via OpenRouter)
- Maintains conversation history
- Used for individual AI personalities

#### `Dating` Class
- Simulates dating conversations between two agents
- Generates questions based on interview data
- Evaluates compatibility with ratings (1-5 per question)
- Provides mutual evaluations

#### `Matching` Class
- **Core simulation engine** for compatibility testing
- Implements three-agent architecture:
  - **Dating Host**: Generates scenarios and calculates compatibility scores
  - **Male Agent**: Makes decisions based on personality profile
  - **Female Agent**: Makes decisions based on personality profile
- Supports both normal mode (database) and sandbox mode (session data)
- Real-time streaming via WebSocket

### 2. **Flask Application** (`app.py`)

#### Main Routes
- `/` - Home page
- `/login_register` - Authentication
- `/users` - Chat interface
- `/discovery` - User discovery
- `/sandbox` - AI sandbox simulation
- `/report` - Compatibility reports
- `/user_profile` - Profile display
- `/user_settings` - Profile editing

#### API Endpoints
- `/users/get-list` - Get available users for chat
- `/users/load_history` - Load chat history
- `/users/dating` - Start dating simulation
- `/matching` - Run compatibility matching
- `/users/get-matching-list` - Get matching results
- `/report/get-report` - Get compatibility report
- `/sandbox/create_avatar` - Create sandbox avatar
- `/sandbox/matching` - Run sandbox simulation
- `/login` - User login
- `/register` - User registration
- `/update_user_info` - Update user profile

### 3. **Database** (`Database.py`)

- MongoDB connection via `pymongo`
- Collections:
  - `Users` - User accounts and profiles
  - `chat-history` - Conversation history
  - `report` - Compatibility reports
  - `matching-list` - Matching results
  - `invitation-code` - Registration codes

### 4. **WebSocket Events** (`socket_events.py`)

- Real-time chat messaging
- Typing indicators
- Sandbox simulation streaming
- Progress updates for matching simulations

---

## 🎯 Key Features

### 1. **User Authentication & Profiles**
- Email/password authentication
- Invitation code system for registration
- Session management (1 hour timeout)
- User profile with avatar, bio, interests, etc.
- Profile editing capabilities

### 2. **Chat System**
- Real-time messaging via WebSocket
- Chat history persistence
- Typing indicators
- User discovery (opposite gender only)

### 3. **Dating Simulation**
- AI agents simulate dating conversations
- Question-based evaluation (10 questions per agent)
- Mutual rating system (1-5 per question)
- Post-conversation evaluations

### 4. **Compatibility Matching**
- Three-agent simulation system
- Scenario-based decision making
- Dynamic compatibility scoring (0-50)
- Up to 10 interaction rounds
- Real-time progress streaming

### 5. **AI Sandbox**
- Create custom avatars with personality profiles
- Simulate compatibility between any two avatars
- Real-time visualization of:
  - Scenario generation (gray blocks)
  - Decision cards (blue for male, pink for female)
  - Compatibility score updates
- No database persistence (session-based)

### 6. **Research Experiments**
- LLM-based matching prediction
- Traditional ML baselines (Logistic Regression, Random Forest, XGBoost)
- Comparison framework
- Speed dating dataset integration

---

## 📅 Development History

### 2025/5/8
- **Chat Page (聊天页面)**: 
  - UI optimization and bug fixes
  - Added responsive design for mobile devices
  - Fixed page layout mismatches
- **Login/Register Page (用户登陆/注册页面)**: New authentication interface
- **User Profile Page (用户信息收集页面)**: New user information collection feature

### 2025/5/9
- **Home Page (主页)**: Complete redesign
- **Product Logic**: Optimized user flow and product logic
- **User Info Editing (用户信息修改)**: New profile modification feature
- **Chat Interface (聊天界面)**: UI improvements

### 2025/5/11
- **Login/Register (用户登录/注册页面)**: 
  - Backend integration with database
  - Login and registration functionality connected to MongoDB
- **User Profile (用户信息收集页面)**: 
  - Users can upload relationship-related information
  - Avatar upload functionality
- **Home Page (主页)**: 
  - Session management implemented (1 hour timeout)
  - Users can freely use all features while logged in
  - User avatar and information display
- **User Settings (用户设置页面)**: 
  - View user avatar and information
  - Edit profile information

### 2025/5/12
- **Discovery Page (匹配页面)**: 
  - User search functionality
  - Users can add others to matching pool
- **Matching Results**: 
  - Results now stored in backend database
  - Database persistence implemented
- **Report Interface (report界面)**: 
  - Matching information can be retrieved from database

### 2025/5/13
- **Registration**: 
  - Invitation code validation required
  - Users must provide valid and unused invitation code to register

### 2025/5/15
- **Agent Updates**: 
  - Updated Agent information for testing purposes

### 2025/5/16
- **User Settings (用户设置)**: 
  - Updated user preference settings
  - Basic information modification and submission

### Recent Enhancements (2025)

#### Security Improvements
- **API Key Migration**: Moved from hardcoded keys to environment variables
- **`.env` file**: Secure API key storage
- **`.gitignore` updates**: Prevent sensitive data leaks

#### Sandbox Feature (NeurIPS MVP - January 2025)
- **"Your Own Love Show" Concept**: Sandbox rebranded as interactive dating show simulator
- **"Love First, Know Later" Integration**: Core research concept prominently featured
- **Real-time Streaming**: WebSocket-based progress updates
- **Visual Display**: Color-coded decision cards and scenario blocks
- **Episode-style Timeline**: "Love Story Replay" with episode cards
- **User Feedback System**: Key moments feedback + global ratings
- **Lightweight Love Observer**: Rule-based commentary (Beta)
- **Profile Quick-Fill**: One-click avatar creation from user profile
- **All English Interface**: Complete translation for international users

#### MVP Improvements (January 2025)
- **Persistent Simulation History**: Save sandbox simulations to database
- **Love Trajectory View**: Track all past simulations and partners
- **Improved UX**: Clear, navigable interface with backtracking support
- **Error Handling**: Better JSON parsing and API key validation

---

## 🔧 Technical Stack

### Backend
- **Flask 3.1.0**: Web framework
- **Flask-SocketIO 5.5.1**: WebSocket support
- **Flask-Session**: Redis-based sessions
- **PyMongo**: MongoDB driver
- **OpenAI API** (via OpenRouter): LLM integration
- **Redis**: Session storage

### Frontend
- **Bootstrap 5.3.2**: UI framework
- **Font Awesome 6.0.0**: Icons
- **Socket.IO Client**: Real-time communication
- **Vanilla JavaScript**: Client-side logic

### Database
- **MongoDB Atlas**: Cloud database
- **Redis**: Session storage (local)

### AI/ML
- **OpenRouter API**: Multi-LLM access
- **GPT-4o**: Primary model for agents
- **Scikit-learn**: ML baselines (experiments)
- **XGBoost**: Gradient boosting (experiments)

---

## 🎨 Design Patterns

### 1. **Three-Agent Architecture**
- Dating Host: Scenario generator and evaluator
- Male/Female Agents: Personality-driven decision makers
- Separation of concerns: Host manages flow, agents make decisions

### 2. **Sandbox Mode**
- Session-based temporary avatars
- No database persistence
- Allows experimentation without affecting real user data

### 3. **Real-time Updates**
- WebSocket streaming for long-running operations
- Progress events for user feedback
- Live scenario and decision display

### 4. **Modular Design**
- Separate classes for Agent, Dating, Matching
- Database abstraction layer
- Route-based feature organization

---

## 📊 Data Flow

### Matching Simulation Flow
```
1. User initiates matching
   ↓
2. Matching.simulation() creates agents
   ↓
3. Dating Host generates first scenario
   ↓
4. Agent (Male/Female) makes decision
   ↓
5. Dating Host evaluates and updates score
   ↓
6. Repeat steps 3-5 (max 10 iterations)
   ↓
7. Store results in database
   ↓
8. Return compatibility score
```

### Sandbox Flow
```
1. User creates avatars (stored in session)
   ↓
2. User selects two avatars
   ↓
3. WebSocket connection established
   ↓
4. Matching.simulation() with sandbox data
   ↓
5. Real-time progress events streamed
   ↓
6. Results displayed (not persisted)
```

---

## 🔐 Security Features

- **Session Management**: Redis-based, 1-hour timeout
- **API Keys**: Environment variable storage
- **Invitation Codes**: Registration access control
- **Password Storage**: Plain text (⚠️ should be hashed)
- **HTTP-only Cookies**: Session cookie security
- **SameSite Protection**: CSRF mitigation

---

## 🚀 Recent Improvements

### API Key Security (2025)
- Migrated to `.env` file
- Added `.env.example` template
- Updated `.gitignore`
- Documented in `API_KEY_MIGRATION.md`

### Sandbox Display (2025)
- Visual scenario blocks (gray)
- Color-coded decision cards (blue/pink)
- Real-time score updates
- Clear interaction flow visualization

### Research Framework (2025)
- Two-stage evaluation system
- Baseline model comparison
- Comprehensive metrics
- Speed dating dataset integration

---

## 📝 Known Issues & TODOs

### Security
- ⚠️ **Password Storage**: Currently plain text, should use hashing
- ⚠️ **API Rate Limiting**: No rate limiting on API endpoints
- ⚠️ **Input Validation**: Limited validation on user inputs

### Features
- 🔄 **Chat History**: Some legacy JSON file usage (should be fully migrated to DB)
- 🔄 **Error Handling**: Could be more comprehensive
- 🔄 **Testing**: No automated tests

### Performance
- 🔄 **Database Queries**: Could be optimized with indexes
- 🔄 **WebSocket**: Connection management could be improved
- 🔄 **Caching**: No caching layer for frequently accessed data

---

## 🎓 Research Context

### "Love First, Know Later" Concept
- Simulate relationship development before deep analysis
- Focus on behavioral compatibility over surface traits
- AI agents make decisions based on personality, not demographics
- Compatibility emerges from interaction patterns

### Experimental Design
- Compare LLM predictions with traditional ML
- Use Columbia Speed Dating dataset
- Two evaluation stages (immediate + reflection)
- Multiple baseline models for comparison

---

## 📚 Documentation Files

- `README.md`: Basic setup instructions
- `AI_DESIGN_EXPLANATION.md`: Detailed AI architecture explanation
- `Development Diary.md`: Original development log (Chinese)
- `STAGE2_IMPLEMENTATION_COMPLETE.md`: Research feature documentation
- `SANDBOX_DISPLAY_FLOW.md`: Sandbox UI/UX documentation
- `API_KEY_MIGRATION.md`: Security migration notes
- `SECURITY_SETUP.md`: Security configuration guide
- `experiments/EXPERIMENTS_README.md`: Research experiment guide

---

## 🔄 Version History

### Current State
- **Branch**: `sandbox`
- **Status**: Active development
- **Recent Focus**: Sandbox feature, research experiments, security improvements

### Uncommitted Changes
- `dump.rdb`: Redis database dump
- `experiments/`: Research experiment code
- `API_KEY_MIGRATION.md`, `SECURITY_SETUP.md`, `STAGE2_IMPLEMENTATION_COMPLETE.md`: Documentation

---

## 🎯 Future Development Areas

### Immediate
1. **Password Hashing**: Implement bcrypt or similar
2. **Input Validation**: Add comprehensive validation
3. **Error Handling**: Improve error messages and logging
4. **Testing**: Add unit and integration tests

### Short-term
1. **Performance Optimization**: Database indexing, query optimization
2. **UI/UX Improvements**: Better mobile experience, loading states
3. **Feature Enhancements**: More matching criteria, better reports
4. **Documentation**: API documentation, deployment guide

### Long-term
1. **Scalability**: Multi-server support, load balancing
2. **Advanced Matching**: Machine learning integration
3. **Analytics**: User behavior tracking, matching success metrics
4. **Internationalization**: Multi-language support

---

## 📞 Development Notes

### Environment Setup
```bash
# Create conda environment
conda create -n cupidAgent python=3.13.2
conda activate cupidAgent

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# Run Redis (for sessions)
redis-server

# Run application
python app.py
```

### Key Configuration
- **Port**: 5001
- **Host**: 0.0.0.0 (all interfaces)
- **Session Timeout**: 36000 seconds (10 hours)
- **Max Matching Iterations**: 10 rounds
- **Compatibility Score Range**: 0-50 (starting at 25)

---

**Last Updated**: 2025-01-XX  
**Maintainer**: Development Team  
**Status**: Active Development


---

## 📅 2025/11/28-29 - NeurIPS MVP Sprint

### MVP Features Implemented

#### Core Simulation
- ✅ Real-time AI dating simulation with WebSocket streaming
- ✅ Episode-style timeline display ("Love Story Replay")
- ✅ Compatibility score with live updates
- ✅ Error handling and graceful fallbacks

#### User Feedback System (v2)
- ✅ **Key Moments Feedback**: Users rate if agent behavior matches their personality
- ✅ **Structured Survey**: Replaced open-text with checkbox/radio options
  - Engagement level
  - Scenario perception (realistic, dramatic, creative)
  - Use case intentions
  - Improvement suggestions (predefined options)
- ✅ Overall likeness score (0-10 slider)

#### Love Observer (Enhanced)
- ✅ Relationship dynamic analysis (Blossoming/Rocky/Balanced)
- ✅ Agent style classification (Romantic/Cautious/Guarded)
- ✅ Key turning point detection
- ✅ Score trajectory visualization

#### Love Trajectory
- ✅ Auto-save simulations to database
- ✅ View all past simulations with partner info
- ✅ Replay past simulations
- ✅ Stats summary (total stories, avg compatibility)

#### UX Improvements
- ✅ Collapsible sections for Live Updates and Timeline
- ✅ Large score display always visible
- ✅ Smooth scrolling within sections
- ✅ Proper state management when switching views

### Known Issues & Future Work
- ⚠️ Multi-avatar drag-and-drop (deferred to v2)
- ⚠️ Agent interaction network visualization (deferred)
- ⚠️ LLM-based Love Observer analysis (currently rule-based)

### Technical Notes
- All text in English for international audience
- Session-based WebSocket with proper error recovery
- Database collections: `sandbox-simulations`, `sandbox-feedback`

