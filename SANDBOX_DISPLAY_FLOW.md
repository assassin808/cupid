# AI Sandbox Display Flow

## Overview
The sandbox now displays AI agent interactions with **crystal clear visual separation** between scenario generation and avatar decisions.

## Display Structure

### 1. **Scenario Blocks** (Gray with 🎬)
- Displayed at the start and after each complete interaction round
- Shows the scenario/question that avatars need to respond to
- Visual: Gray gradient background with purple left border
- Format: 
  ```
  🎬 Scenario [N]
  [Scenario text/question]
  ```

### 2. **Decision Cards** (Gender-specific colors)
- **Male Decisions**: Blue left border with 👨 icon
- **Female Decisions**: Pink left border with 👩 icon
- Each card shows:
  - Avatar name in header
  - "MALE" or "FEMALE" badge
  - **Choice**: The option selected (A, B, C, etc.)
  - **Action**: What the avatar does
  - **Rationale**: Why they made this choice

### 3. **Score Updates** (Pink with 💕)
- Shows after each complete interaction
- Format: `💕 Compatibility Score Updated: [X]/50`
- Live updates the final score display

## Interaction Flow

```
🎬 Scenario 1: "You both arrive at a coffee shop..."

👨 Alex (MALE)
   Choice: A
   Action: Suggests trying the specialty coffee
   Rationale: Wants to explore new experiences together

👩 Emma (FEMALE)
   Choice: B
   Action: Agrees and adds a suggestion for pastries
   Rationale: Building on his idea shows cooperation

💕 Compatibility Score Updated: 8/50

🎬 Scenario 2: "The conversation turns to weekend plans..."

[... and so on ...]
```

## Technical Implementation

### Backend (utils.py)
Emits 3 types of structured events:

1. **scenario_generated**
   ```python
   {
       'step': 'scenario_generated',
       'iteration': 1,
       'scenario': "Scenario text here..."
   }
   ```

2. **decision_made**
   ```python
   {
       'step': 'decision_made',
       'avatar_name': 'Emma',
       'gender': 'female',
       'decision': {
           'option': 'A',
           'content': 'Action description'
       },
       'rationale': 'Reasoning for choice',
       'iteration': 1
   }
   ```

3. **rating_updated**
   ```python
   {
       'step': 'rating_updated',
       'cumulative_rate': 8,
       'max_rate': 50,
       'iteration': 1
   }
   ```

### Frontend (sandbox.js)
Handles events with specific rendering functions:

- `addLiveScenario(iteration, scenario)` - Creates gray scenario blocks
- `addLiveDecision(name, gender, decision, rationale)` - Creates color-coded decision cards
- Score updates insert inline with 💕 emoji

### Styling (sandbox.css)
- `.live-scenario` - Gray gradient with purple border
- `.live-decision` - White background with gender-specific left border
- `.live-decision.male` - Blue border (#4a90e2)
- `.live-decision.female` - Pink border (#ff69b4)
- `.live-score-update` - Inline score display

## Result
Users can now clearly see:
1. What scenario the AI Engine creates
2. How Avatar 1 responds (with full reasoning)
3. How Avatar 2 responds (with full reasoning)
4. How compatibility changes after each interaction
5. The complete conversation flow from start to finish

The display perfectly supports the "Love First, Know Later" research concept by making AI decision-making transparent and traceable.
