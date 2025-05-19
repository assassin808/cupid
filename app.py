from flask import Flask
from flask import render_template,request,redirect,url_for,session,jsonify,abort
from utils import Agent
from utils import Dating
from utils import Matching
from bson.objectid import ObjectId
import secrets
import json
import os
from Database import dbClient
from socket_events import socketio
app = Flask(__name__,template_folder="website",static_folder = "website/static")
app.config['UPLOAD_FOLDER'] = 'website/static/'
secret_key =secrets.token_hex(32)
app.secret_key = secret_key
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_NAME'] = 'session'
app.permanent_session_lifetime = 36000  # session 有效期为 1 小时

socketio.init_app(app)
@app.route('/',methods = ["GET"])
def Index():
    return render_template("home.html")


@app.route("/users",methods = ["GET","POST"])
def users():
    return render_template("chat.html")

@app.route("/users/get-list",methods = ["POST"])
def getList():
    data = request.get_json()
    db = dbClient()
    users = db.getCollection("Users").find({},{"password":0})
    list = []
    for i in users:
        try:
            
            if not (str(i['_id']) == data['user_Id'] and i['information']['gender'] == data['user_gender']):
                list.append({'name':i['information']['nickname'], 'id':str(i['_id']), 'avatarUrl':i['information']['avatar'], 'gender':i["information"]["gender"]})
        except:
            pass
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

    desiredReport = {"user_Id":data['user_Id'],"reports":[]}
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


    db = dbClient()
    db.getCollection("report").update_one({"user_Id":data['user_Id']}, {"$set":{"reports":desiredReport['reports']}},upsert=True)
    return {"status":"ok"}

@app.route("/report", methods = ["GET"])
def report():
    return render_template("report.html")
@app.route("/report/get-report",methods = ["POST"])
def get_report():
    data = request.get_json()
    print(data)
    db = dbClient()
    reports = db.getCollection("report").find_one({"user_Id":data['user_Id']})
    print(reports)
    item = [d for d in reports['reports'] if d['reporter_id'] == data['agent']['id']][0]
    return {'report':item['report']}

@app.route('/login_register', methods=['GET'])
def login_register():
    return render_template('login_register.html')

@app.route('/user_profile', methods=['GET'])
def user_profile():
    return render_template('user_profile.html')

@app.route('/user_settings', methods=['GET'])
def user_settings():
    return render_template('user_settings.html') 

@app.route('/discovery', methods=['GET'])
def discovery():
    return render_template('discovery.html')
@app.route("/login",methods = ["POST"])
def login():
    data = request.get_json()
    db = dbClient()
    user = db.getCollection("Users").find_one({"email":data["email"]})
    if user:
        if user["password"] == data["password"]:
            user['_id'] = str(user['_id'])
            session['logged_user'] = user
            print(session['logged_user'])
            return {"status":"ok"}
        else:
            return {"status":"fail","message":"Password is incorrect"}
    return {"status":"fail","message":"Email is incorrect"}
@app.route("/register",methods = ["POST"])
def register():
    data = request.get_json()
    db = dbClient()
    try:
        #check if the invitation code is valid
        invitation_code = db.getCollection("invitation-code").find_one({"code":data["invite"]})
        if not invitation_code:
            return {"status":"fail","message":"Invitation code is invalid"}
        if invitation_code["is_used"]:
            return {"status":"fail","message":"Invitation code is already used"}
        #check if the email is already in the database
        if db.getCollection("Users").find_one({"email":data["email"]}):
            return {"status":"fail","message":"Email already exists"}
        db.getCollection("Users").insert_one({
            "email":data["email"],
            "password":data["password"]
        })
        db.getCollection("invitation-code").update_one({"code":data["invite"]}, {"$set":{"is_used":True}})
        login()
        return {"status":"ok"}
    except:
        return {"status":"fail","message":"System Error"}

@app.route('/logout', methods=['GET'])
def logout():
    session.clear()
    return redirect(url_for('login_register'))

@app.route('/get_user_info', methods=['GET'])
def get_user_info():
    information = session['logged_user']
    information.pop('password')
    try:
        return information
    except:
        abort(401,description="Unauthorized")
        #return {"status":"fail","message":"User not logged in"}
@app.route('/update_user_info', methods=['POST'])
def update_user_info():
    if 'logged_user' not in session:
        abort(401,description="Unauthorized")
        #return {"status":"fail","message":"User not logged in"}
    form_data = request.form.to_dict()
    avatar = request.files.get('avatar')
    if avatar:
        avatar_path = os.path.join(app.config['UPLOAD_FOLDER'],'avatars', avatar.filename)
        avatar.save(avatar_path)
        form_data['avatar'] = os.path.join('static/avatars', avatar.filename)
    else:
        form_data['avatar'] = session['logged_user']['information']['avatar']
    db = dbClient()
    try:
        db.getCollection("Users").update_one({"_id":ObjectId(session['logged_user']['_id'])}, 
                                             {"$set":{"information": form_data}})
        session['logged_user']['information'] = form_data
        return {"status":"ok"}
    except:
        return {"status":"fail","message":"System Error"}
    

if __name__ == "__main__":
    socketio.run(app,debug = True,port = 8080)
    

    









