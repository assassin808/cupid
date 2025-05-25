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
        maleAgentInfo = db.getCollection("Users").find_one({"_id":self.male},{"password":0})['information']
        maleInterview = ""
        maleInstruction = f"""
            You are {maleAgentInfo["nickname"]}, you will meet a girl. You have a chance to fall in love with her and spend your whole rest of your life with her, but it depends you.
            No matter you like her or not, you should make the real reactions based on who you are.
            Here is your basic information:
            {maleAgentInfo}
            Here is your interview as a supplement document:
            {maleInterview}
            Your will need to make decicions in different scenario questions based on the information above. Here are the complementary information for you:
            # Rationale
            The rationale is a first-person sentence of what you are thinking when you make the decision. It should be a short sentence that explains why you are making the decicion.\
            # Output Format
            You need to make the decision and provide rationale for the action. Your output should follow a strict JSON form:
            {
                Jsonform
            }
        """

        maleAgent = Agent(maleInstruction, name = maleAgentInfo['nickname'])

        femaleAgentInfo = db.getCollection("Users").find_one({"_id":self.female},{"password":0})['information']
        femaleAgentInfo.pop('avatar')
        femaleInterview = ""
        femaleInstruction = f"""
            You are {femaleAgentInfo["nickname"]}, you will meet a boy. You have a chance to fall in love with him and spend your whole rest of your life with him, but it depends on you.
            No matter you like him or not, you should make the real reactions based on who you are.
            Here is your basic information:
            {femaleAgentInfo}
            Here is your interview as a supplement document:
            {femaleInterview}
            Your will need to make decicions in different scenario questions based on the information above. Here are the complementary information for you:
            # Rationale
            The rationale is a first-person sentence of what you are thinking when you make the decision. It should be a short sentence that explains why youare making the decicion.
            # Output Format
            You need to make the decision and provide rationale for the action. Your output should follow a strict JSON form:
            {
                Jsonform
            }
        """
        femaleAgent = Agent(femaleInstruction, name = femaleAgentInfo['nickname'])

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
        f = open("example.txt","r")
        example = f.read()
        hostIntroduction = f"""
        You are a life simulator, your job is to simulate a potential couple's aquaintance, communicaiton and ending.
        Here is the example of the interaction:
        {example}
        <IMPORTANT>
        Your task is to make actions to provide scenario questions with options and predict the next state based on the timeline.The timeline across their whole life. The interactions should not exceed 20 interactions.
        You need to pretend yourself a life simulator, simulate scenarios that based on the female and male choices.
        You need to predict the next state of their interaction based on their history interaction. And give the cumulative rate of the interaction based on the history interaction. Notice: The cumulative rate can be reduced and increased based on the interaction.
        You start the first predict state when you get the command "/Start"
        You should stop when you think the interaction is over.
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
        {
            hostform
        }
        """
        datingHost = Agent(hostIntroduction,"Dating Host")
        first_action = datingHost.sendMessage("/Start")
        state = json.loads(first_action)
        simulation_result = []
        simulation_result.append(state)
        while state['action']['type'] != "end":
            response = ''
            if state['action']['object'] == "Female":
                response = json.loads(femaleAgent.sendMessage("Question: {0} Answers: {1}".format(state['action']['question'],state['action']['answers'])))
            else:
                response = json.loads(maleAgent.sendMessage("Question: {0} Answers: {1}".format(state['action']['question'],state['action']['answers'])))
            simulation_result.append(response)
            state = json.loads(datingHost.sendMessage(response))
            simulation_result.append(state)
        return simulation_result,state['cumulative_rate']