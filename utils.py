from openai import OpenAI
# role : system, assistant, user
import json
from Database import dbClient
class Agent:
    def __init__(self, instruction:str, name:str,model:str = "openai/gpt-4o"): # initiate with agent pre-define -- instruction and model
        self.name = name
        self.messages = [{"role":"system", "content":instruction}]
        self.model = model
        self.client = OpenAI(
            base_url = "https://openrouter.ai/api/v1",
            api_key = "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"
        )

    def sendMessage(self, content:str):
        self.messages.append({"role":"user", "content":content})
        response = self.client.chat.completions.create(
            model= self.model,
            messages = self.messages
        )
        self.messages.append({"role":"assistant","content":response.choices[0].message.content})
        return response.choices[0].message.content

class Dating:
    def __init__(self, female:Agent, male:Agent):
        self.female = female
        self.male = male
        self.messages = []
        self.model = "openai/gpt-4o"
        self.female_questions = []
        self.male_questions = []
        self.client = OpenAI(
            base_url = "https://openrouter.ai/api/v1",
            api_key = "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"
        )
    def startDating(self):
        #introduction
        response = self.female.sendMessage("Hello, I am {0}, Nice to meet you. Can you introduce yourself?".format(self.male.name))
        self.male.messages.append({"role":"user", "content":response})
        response = self.male.sendMessage("Hello, I am {0}, Nice to meet you. Can you introduce yourself?".format(self.female.name))
        self.female.messages.append({"role":"user", "content":response})

        #questions collection
        response = self.female.sendMessage("Can you prepare 10 quetsions that you concern mostly? You shold give questions based on the interview, and give the quetsions directly without any explaination by format : 1.quetion1.... 2. question2... Questions:")
        self.female_questions = [q.split(". ", 1)[1] if ". " in q else q for q in response.split("\n") if q.strip()]
        response = self.male.sendMessage("Can you prepare 10 quetsions that you concern mostly? You shold give questions based on the interview, and give the quetsions directly without any explaination by format : 1.quetion1.... 2. question2... Questions:")
        
        self.male_questions = [q.split(". ", 1)[1] if ". " in q else q for q in response.split("\n") if q.strip()]
        self.male.messages.pop()
        self.male.messages.pop()
        self.female.messages.pop()
        self.female.messages.pop()
        female_rating = 0
        male_rating = 0
        #evaluations
        for question in self.female_questions:
            response = self.male.sendMessage(question + "You should answer the question based on the interview and your feeling.")
            print(response)
            self.female.messages.append({"role":"assistant", "content":question})
            self.female.messages.append({"role":"user", "content":response})
            response = self.female.sendMessage("Please give a mark for {}'s performance based on the interview and chat history, and give your mark from 1 to 5 directly give the numeric answer without any explaination, Answer:".format(self.male.name))
            female_rating += int(response)
            self.female.messages.pop()
            self.female.messages.pop()

        for question in self.male_questions:
            response = self.female.sendMessage(question + "You should answer the question based on the interview and your feeling.")
            self.male.messages.append({"role":"assistant", "content":question})
            self.male.messages.append({"role":"user", "content":response})
            response = self.male.sendMessage("Please give a mark for {}'s performance based on the interview and chat history, and give your mark from 1 to 5 directly give the numeric answer without any explaination, Answer:".format(self.female.name))
            male_rating += int(response)
            self.male.messages.pop()
            self.male.messages.pop()
        return female_rating, male_rating
    def evaluate(self):
        female_evaluation = self.female.sendMessage("Based on the interview and chatting history, can you evaluate {}'s shortcomming and strength? Answer:".format(self.male.name))
        male_evaluation = self.male.sendMessage("Based on the interview and chatting history, can you evaluate {}'s shortcomming and strength? Answer:".format(self.female.name))

        return female_evaluation, male_evaluation
class Matching:
    def __init__(self, female, male):
        self.female = female
        self.male = male
        self.female_info = None  # For sandbox mode
        self.male_info = None    # For sandbox mode
        self.socketio = None     # For streaming updates
        self.user_sid = None     # Socket ID for streaming
        
    def emit_progress(self, event, data):
        """Helper to emit progress updates if socketio is available"""
        if self.socketio and self.user_sid:
            self.socketio.emit(event, data, room=self.user_sid)
        
    def simulation(self):
        db = dbClient()
        Jsonform = {
            "gender": "<Female or Male>",
            "decision":{
                "Option": "<Option here>",
                "Content": "<Decision content here>"
            },
            "rationale":"<rationale>"
        }
        Jsonform = json.dumps(Jsonform)
        
        # Get user information - check if sandbox mode first
        if self.male_info:
            # Sandbox mode - use provided data
            maleAgentInfo = self.male_info.copy()
        else:
            # Normal mode - get from database
            maleAgentInfo = db.getCollection("Users").find_one({"_id":self.male},{"password":0})['information']
        
        maleAgentInfo.pop('avatar', None)  # Remove avatar if exists
        
        # Create personality description from user info
        malePersonality = f"""
        Nickname: {maleAgentInfo.get('nickname', 'Unknown')}
        Gender: {maleAgentInfo.get('gender', 'Male')}
        Age: {maleAgentInfo.get('age', 'Unknown')}
        Location: {maleAgentInfo.get('location', 'Unknown')}
        Occupation: {maleAgentInfo.get('occupation', 'Unknown')}
        Interests: {maleAgentInfo.get('interests', 'Various interests')}
        About: {maleAgentInfo.get('bio', 'A person looking for connection')}
        """
        
        maleInstruction = f"""
            You are {maleAgentInfo.get("nickname", "a person")}, you will meet a girl. You have a chance to fall in love with her and spend your whole rest of your life with her, but it depends on you.
            No matter you like her or not, you should make the real reactions based on who you are.
            Here is your basic information:
            {malePersonality}
            
            Make decisions that reflect your personality and preferences. Your will need to make decisions in different scenario questions based on the information above.
            # Rationale
            The rationale is a first-person sentence of what you are thinking when you make the decision. It should be a short sentence that explains why you are making the decision.
            # Output Format
            You need to make the decision and provide rationale for the action. Your output should follow a strict JSON form:
            {Jsonform}
        """

        maleAgent = Agent(maleInstruction, name = maleAgentInfo.get('nickname', 'Unknown'))

        # Get female user information - check if sandbox mode first
        if self.female_info:
            # Sandbox mode - use provided data
            femaleAgentInfo = self.female_info.copy()
        else:
            # Normal mode - get from database
            femaleAgentInfo = db.getCollection("Users").find_one({"_id":self.female},{"password":0})['information']
        
        femaleAgentInfo.pop('avatar', None)
        
        femalePersonality = f"""
        Nickname: {femaleAgentInfo.get('nickname', 'Unknown')}
        Gender: {femaleAgentInfo.get('gender', 'Female')}
        Age: {femaleAgentInfo.get('age', 'Unknown')}
        Location: {femaleAgentInfo.get('location', 'Unknown')}
        Occupation: {femaleAgentInfo.get('occupation', 'Unknown')}
        Interests: {femaleAgentInfo.get('interests', 'Various interests')}
        About: {femaleAgentInfo.get('bio', 'A person looking for connection')}
        """
        
        femaleInstruction = f"""
            You are {femaleAgentInfo.get("nickname", "a person")}, you will meet a boy. You have a chance to fall in love with him and spend your whole rest of your life with him, but it depends on you.
            No matter you like him or not, you should make the real reactions based on who you are.
            Here is your basic information:
            {femalePersonality}
            
            Make decisions that reflect your personality and preferences. Your will need to make decisions in different scenario questions based on the information above.
            # Rationale
            The rationale is a first-person sentence of what you are thinking when you make the decision. It should be a short sentence that explains why you are making the decision.
            # Output Format
            You need to make the decision and provide rationale for the action. Your output should follow a strict JSON form:
            {Jsonform}
        """
        femaleAgent = Agent(femaleInstruction, name = femaleAgentInfo.get('nickname', 'Unknown'))

        actions = [{},{}]
        actions[0] = {
            "type": "predict",
            "object": "<Female or Male>",
            "question": "<Question here>",
            "answers": "<Answers here Example: A.... B.... C....> ",
        }
        actions[1] = {
            "type": "end"
        }
        actions[0] = json.dumps(actions[0])
        actions[1] = json.dumps(actions[1])
        hostform = {
            "action": {
                "type": "<Type here>",
                "object": "<Female or Male>",
                "question": "<Question here>",
                "answer": "<Answer here>"
            },
            "time": "<Time here>",
            "cumulative_rate": "<Cumulative rate here (Number from 0 to 50)>",
            "rationale": "<Rationale here>"
        }
        hostform = json.dumps(hostform)
        
        # Simplified example for the host
        example = """Example:
/Start
Your action:
{"action": {"type": "predict", "object": "Female", "question": "You meet at a coffee shop. Do you start a conversation?", "answers": "A. Yes, introduce yourself. B. No, stay quiet. C. Smile and wait."}, "cumulative_rate": "25", "time":"Day 1, Morning","rationale": "Initial meeting scenario."}
Female answer:
{"gender":"Female","decision": {"option":"A", "content":"Yes, introduce yourself."},"rationale":"I enjoy meeting new people."}
Your action:
{"action":{"type":"end"},"time":"Day 1, Afternoon","cumulative_rate":"40","rationale":"Good connection established."}
"""
        
        hostIntroduction = f"""
        You are a life simulator, your job is to simulate a potential couple's acquaintance, communication and ending.
        Here is the example of the interaction:
        {example}
        <IMPORTANT>
        Your task is to make actions to provide scenario questions with options and predict the next state based on the timeline. The timeline should be realistic. The interactions should not exceed 10 interactions to keep it concise.
        You need to pretend yourself a life simulator, simulate scenarios based on the female and male choices.
        You need to predict the next state of their interaction based on their history interaction. And give the cumulative rate of the interaction based on the history interaction. Notice: The cumulative rate can be reduced and increased based on the interaction (scale 0-50).
        You start the first predict state when you get the command "/Start"
        You should stop when you think the interaction should conclude (either positive or negative outcome).
        </IMPORTANT>
        # Rationale
        The rationale is a first-person sentence of what you are thinking when you make the action. It should be a short sentence that explains why you are making the action.
        # Action Space
        An action is represented in JSON format, and there are two primary types of actions:
        #### 1. "predict"
        {actions[0]}
        #### 2. "end"
        {actions[1]}
        # Output format:
        You need to predict and provide rationale for the action. Your output should follow a strict JSON form:
        {hostform}
        """
        datingHost = Agent(hostIntroduction,"Dating Host")
        
        try:
            self.emit_progress('simulation_progress', {
                'step': 'init',
                'message': '🎬 Creating AI agents with personality profiles...'
            })
            
            first_action = datingHost.sendMessage("/Start")
            state = json.loads(first_action)
            simulation_result = []
            simulation_result.append(state)
            
            self.emit_progress('simulation_progress', {
                'step': 'scenario_generated',
                'iteration': 1,
                'scenario': state["action"].get("question", "Starting simulation...")
            })
            
            # Limit iterations to prevent infinite loops
            max_iterations = 10
            iteration_count = 0
            
            while state['action']['type'] != "end" and iteration_count < max_iterations:
                iteration_count += 1
                
                response = ''
                if state['action']['object'] == "Female":
                    response = json.loads(femaleAgent.sendMessage("Question: {0} Answers: {1}".format(state['action']['question'],state['action']['answers'])))
                    self.emit_progress('simulation_progress', {
                        'step': 'decision_made',
                        'avatar_name': femaleAgentInfo.get('nickname', 'Female'),
                        'gender': 'female',
                        'decision': response.get('decision', {}),
                        'rationale': response.get('rationale', 'No rationale provided'),
                        'iteration': iteration_count
                    })
                else:
                    response = json.loads(maleAgent.sendMessage("Question: {0} Answers: {1}".format(state['action']['question'],state['action']['answers'])))
                    self.emit_progress('simulation_progress', {
                        'step': 'decision_made',
                        'avatar_name': maleAgentInfo.get('nickname', 'Male'),
                        'gender': 'male',
                        'decision': response.get('decision', {}),
                        'rationale': response.get('rationale', 'No rationale provided'),
                        'iteration': iteration_count
                    })
                    
                simulation_result.append(response)
                
                state = json.loads(datingHost.sendMessage(json.dumps(response)))
                simulation_result.append(state)
                
                self.emit_progress('simulation_progress', {
                    'step': 'rating_updated',
                    'cumulative_rate': state.get('cumulative_rate', 25),
                    'max_rate': 50,
                    'iteration': iteration_count
                })
                
                # Emit next scenario if not ending
                if state['action']['type'] != "end":
                    self.emit_progress('simulation_progress', {
                        'step': 'scenario_generated',
                        'iteration': iteration_count + 1,
                        'scenario': state["action"].get("question", "Continuing simulation...")
                    })
            
            return simulation_result, state.get('cumulative_rate', '25')
        except Exception as e:
            print(f"Simulation error: {e}")
            # Return a minimal result if simulation fails
            return [{"action": {"type": "end"}, "cumulative_rate": "0", "rationale": "Simulation encountered an error"}], "0"