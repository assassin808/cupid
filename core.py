from flask import Flask
from flask import render_template,request
from utils import Agent
from utils import Dating
import json
app = Flask(__name__,template_folder="website",static_folder = "website/static")

@app.route("/",methods = ["GET"])
def hello():
    return render_template("index.html")

@app.route("/users/get-list",methods = ["GET"])
def getList():
    with open("interview-list.json", "r") as f:
        data = json.load(f)
        #print(data)
        list = []
        for i in data:
            if not i['name'] == "Zhengyang YAN": #Change to User name
                list.append({'name':i['name'], 'id':i['id']})
    return list
@app.route("/users/load_history", methods=["GET"])
def load_history():
    try:
        with open("chat_history.json", "r") as f:
            history = json.load(f)
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
if __name__ == "__main__":
    app.run(debug = True,port = 8080)

    









