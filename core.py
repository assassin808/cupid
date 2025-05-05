from flask import Flask
from flask import render_template,request,redirect,url_for
from utils import Agent
from utils import Dating
from utils import Matching
import json
app = Flask(__name__,template_folder="website",static_folder = "website/static")
@app.route('/',methods = ["GET"])
def Index():
    return render_template("index.html")


@app.route("/users",methods = ["GET","POST"])
def users():
    return render_template("chat.html")

@app.route("/users/get-list",methods = ["POST"])
def getList():
    with open("interview-list.json", "r") as f:
        data = json.load(f)
        #print(data)
        users = request.get_json()
        list = []
        for i in data:
            if not (i['id'] == users['user_Id']): 
                list.append({'name':i['name'], 'id':i['id'], 'avatarUrl':i['avatarUrl'], 'gender':i["gender"]})
    return list


@app.route("/users/load_history", methods=["POST"])
def load_history():
    data = request.get_json()
    try:
        with open("chat-history.json", "r") as f:
            history = json.load(f)
            history = [d for d in history if d["sender_id"]==data["id"]][0]
            return {"conversations": history}
    except FileNotFoundError:
        return {"conversations": {}}

@app.route("/users/chat", methods = ["POST"])
def chat():
    if request.method == "POST":
        data = request.get_json()
    agent = Agent("",data['name'],data['id'])

    #load history
    f = open("chat-history.json", "r")

    chatHistory = json.load(f)
    content = [d for d in chatHistory if d["sender_id"] == data["sender_id"]][0]
    try:
        messages = [d for d in content["chat"] if d["receiver_id"] == data["id"]][0]
        for i in messages["content"]:
            if i["type"] == "sent":
                agent.addMessage(i["message"],i["type"])
    except:
        messages = {"receiver_id":data["id"],"content":[]}
        content['chat'].append(messages)
    
    f.close()
    #get the response
    response = agent.sendMessage(data["content"])

    #save the history
    messages["content"].append({"type":"sent","message":data["content"]})
    messages["content"].append({"type":"received","message":response})
   

    for i,d in enumerate(content['chat']):
        if d["receiver_id"] == data["id"]:
            content['chat'][i] = messages
            break
    for i,d in enumerate(chatHistory):
        if d["sender_id"] == data["sender_id"]:
            chatHistory[i] = content
            break
    f = open("chat-history.json","w")
    f.write(json.dumps(chatHistory))
    f.close()
    return {"message": response}

@app.route("/users/dating",methods = ["POST"])
def dating():
    data = request.get_json()
    male_agent = ''
    female_agent = ''
    if data["user_gender"] == "male":
        male_agent = Agent("",data['user_name'],data['user_Id'])
        female_agent = Agent("",data['name'],data['id'])
    elif data["user_gender"] == "female":
        female_agent = Agent("",data['user_name'],data['user_Id'])
        male_agent = Agent("",data['name'],data['id'])
    datingClass = Dating(female_agent,male_agent)
    female_rating,male_rating,female_messages,male_messages = datingClass.startDating()
    female_evaluation, male_evaluation = datingClass.evaluate()
    user_messages = ''
    agent_messages = ''
    user_evaluation = ''
    agent_evaluation = ''
    user_rating = ''
    agent_rating = ''
    if data["user_gender"] == "male":
        user_messages = male_messages
        agent_messages = female_messages
        user_evaluation = male_evaluation
        agent_evaluation = female_evaluation
        user_rating = male_rating
        agent_rating = female_rating
    elif data["user_gender"] == "female":
        agent_messages = male_messages
        user_messages = female_messages
        user_evaluation = female_evaluation
        agent_evaluation = male_evaluation
        user_rating = female_rating
        agent_rating = male_rating
    

    #load history
    f = open("chat-history.json", "r")

    chatHistory = json.load(f)
    content = [d for d in chatHistory if d["sender_id"] == data["user_Id"]][0]
    try:
        messages = [d for d in content["chat"] if d["receiver_id"] == data["id"]][0]
    except:
        messages = {"receiver_id":data["id"],"content":[]}
        content['chat'].append(messages)
    f.close()


    #save to history
    for item in user_messages:
        if item['role'] == 'user':
            messages['content'].append({'type':'received','message':item['content']})
        elif item['role'] == 'assistant':
            messages['content'].append({'type':'sent','message':item['content']})
    for item in agent_messages:
        if item['role'] == 'user':
            messages['content'].append({'type':'sent','message':item['content']})
        elif item['role'] == 'assistant':
            messages['content'].append({'type':'received','message':item['content']})
    
    messages['content'].append({'type':'sent','message':f"I would like to give you a rating {user_rating}/50"})
    messages['content'].append({'type':'received','message':f"I would like to give you a rating {agent_rating}/50"})
    
    messages['content'].append({'type':'sent','message': user_evaluation})
    messages['content'].append({'type':'received','message': agent_evaluation})
    
    for i,d in enumerate(content['chat']):
        if d["receiver_id"] == data["id"]:
            content['chat'][i] = messages
            break
    for i,d in enumerate(chatHistory):
        if d["sender_id"] == data["user_Id"]:
            chatHistory[i] = content
            break
    f = open("chat-history.json","w")
    f.write(json.dumps(chatHistory))
    f.close()
    
    return {"status":"ok"}
@app.route("/matching",methods = ["POST"])
def matching():
    data = request.get_json()
    f = open("report.json","r")
    reports = json.load(f)
    f.close()
    #print(reports)
    desiredReport = [d for d in reports if d['user_Id'] == data['user_Id']][0]
    desiredReport["reports"] = []
    for user in data['agents']:
        female_agent = ''
        male_agent = ''
        if user['gender'] == "female":
            male_agent = Agent("",data['user_name'],data['user_Id'])
            female_agent = Agent("",user['name'],user['id'])
        else:
            female_agent = Agent("",data['user_name'],data['user_Id'])
            male_agent = Agent("",user['name'],user['id'])
        matching = Matching(female_agent, male_agent, user['rating'])
        report = matching.rawMatching()
        desiredReport['reports'].append({"reporter_id":user["id"],"report":report})
    for i,d in enumerate(reports):
        if d['user_Id'] == data['user_Id']:
            reports[i] = desiredReport
    f = open("report.json",'w')
    f.write(json.dumps(reports))
    f.close()
    return {"status":"ok"}

@app.route("/report", methods = ["GET"])
def report():
    return render_template("report.html")
@app.route("/report/get-report",methods = ["POST"])
def get_report():
    data = request.get_json()
    print(data)
    f = open("report.json",'r')
    reports = json.load(f)
    item = [d for d in reports if d['user_Id'] == data['user_Id']][0]
    desiredItem = [d for d in item['reports'] if d['reporter_id'] == data['agent']['id']][0]
    return {'report':desiredItem['report']}
if __name__ == "__main__":
    app.run(debug = True,port = 8080)
    

    









