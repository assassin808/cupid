from flask import Flask
from flask import render_template,request,redirect,url_for,session,jsonify,abort
from utils import Agent
from utils import Dating
from utils import Matching
from bson.objectid import ObjectId
import redis
from flask_session import Session
import secrets
import json
import os
from Database import dbClient
from socket_events import socketio
app = Flask(__name__,template_folder="website",static_folder = "website/static")
app.config['UPLOAD_FOLDER'] = 'website/static/'
secret_key =secrets.token_hex(32)
app.secret_key = secret_key
app.config['SESSION_TYPE'] = 'redis'
app.config["SESSION_REDIS"] = redis.Redis(host = "localhost", port = 6379, db = 0)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_NAME'] = 'session'
app.permanent_session_lifetime = 36000  # session 有效期为 1 小时
socketio.init_app(app)
Session(app)
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
    session_user = session['logged_user'] 
    for i in users:
        try:
            if str(i['_id']) != session_user['_id'] and i['information']['gender'] != session_user['information']['gender']:
                list.append({'name':i['information']['nickname'], 'id':str(i['_id']), 'avatarUrl':i['information']['avatar'], 'gender':i["information"]["gender"]})
        except:
            pass
    print(list)
    return list

@app.route("/users/load_history", methods=["POST"])
def load_history():
    data = request.get_json()
    print(data)
    db = dbClient()
    history = db.getCollection("chat-history").find_one({"sender_id":data["id"]})
    if history is None:
        db.getCollection("chat-history").insert_one({"sender_id":data["id"],"chat":[]})
        history = db.getCollection("chat-history").find_one({"sender_id":data["id"]})
    history.pop("_id")
    return {"conversations": history}
"""
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
"""
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
    print(data)
    matchingResult = ''
    try:
        if data['agent']['gender'] == 'male':
            matchingResult = Matching(ObjectId(data['user_Id']),ObjectId(data['agent']['id']))
        elif data['agent']['gender'] == 'female':
            matchingResult = Matching(ObjectId(data['agent']['id']),ObjectId(data['user_Id']))
        
        simulation_result, cumulative_rate = matchingResult.simulation()
        
        # Convert cumulative_rate to int safely
        try:
            cumulative_rate_int = int(cumulative_rate) if cumulative_rate else 25
        except:
            cumulative_rate_int = 25
        
        db = dbClient()
        
        # Store report with better structure
        report_data = {
            "simulation": simulation_result,
            "cumulative_rate": cumulative_rate_int,
            "timestamp": str(ObjectId())
        }
        
        if data['agent']['gender'] == 'male':
            db.getCollection("report").update_one(
                {"female_id":data['user_Id'],"male_id":data['agent']['id']},
                {"$set":report_data},
                upsert=True
            )
        elif data['agent']['gender'] == 'female':
            db.getCollection("report").update_one(
                {"male_id":data['user_Id'],"female_id":data['agent']['id']},
                {"$set":report_data},
                upsert=True
            )
        
        db.getCollection("matching-list").update_one(
            {"user_Id":data['user_Id']},
            {"$push":{"list":{
                "agent_id":data['agent']['id'],
                "rating":cumulative_rate_int
            }}},
            upsert=True
        )
        db.getCollection("matching-list").update_one(
            {"user_Id":data['agent']['id']},
            {"$push":{"list":{
                "agent_id":data['user_Id'],
                "rating":cumulative_rate_int
            }}},
            upsert=True
        )
        
        return {"status":"ok","cumulative_rate":cumulative_rate_int}
    except Exception as e:
        print(f"Matching error: {e}")
        import traceback
        traceback.print_exc()
        return {"status":"error","message":str(e)}, 500

@app.route("/users/get-matching-list",methods = ["POST"])
def get_matching_list():
    data = request.get_json()
    print(data)
    db = dbClient()
    matching_list = db.getCollection("matching-list").find_one({"user_Id":data['user_Id']})
    print(matching_list)
    if matching_list is None:
        db.getCollection("matching-list").insert_one({"user_Id":data['user_Id'],"list":[]})
        matching_list = db.getCollection("matching-list").find_one({"user_Id":data['user_Id']})
    return matching_list['list']
@app.route("/report", methods = ["GET"])
def report():
    return render_template("report.html")
@app.route("/report/get-report",methods = ["POST"])
def get_report():
    data = request.get_json()
    print(data)
    reports = ''
    try:
        db = dbClient()
        if data['agent']['gender'] == 'male':
            reports = db.getCollection("report").find_one({"female_id":data['user_Id'],"male_id":data['agent']['id']})
        elif data['agent']['gender'] == 'female':
            reports = db.getCollection("report").find_one({"male_id":data['user_Id'],"female_id":data['agent']['id']})
        
        if reports:
            # Return the simulation data from the new structure
            return {'report': reports.get('simulation', reports.get('reports', []))}
        else:
            return {'report': []}, 404
    except Exception as e:
        print(f"Report error: {e}")
        return {'report': [], 'error': str(e)}, 500

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

@app.route('/sandbox', methods=['GET'])
def sandbox():
    return render_template('sandbox.html')

@app.route('/sandbox/create_avatar', methods=['POST'])
def create_avatar():
    if 'logged_user' not in session:
        return {"status":"fail","message":"Not logged in"}, 401
    
    data = request.get_json()
    avatar_number = data.get('avatarNumber')
    avatar_data = data.get('avatarData')
    
    # Initialize sandbox avatars in session if not exists
    if 'sandbox_avatars' not in session:
        session['sandbox_avatars'] = {}
    
    # Store avatar in session
    session['sandbox_avatars'][f'avatar{avatar_number}'] = avatar_data
    session.modified = True
    
    return {"status":"ok","message":f"Avatar {avatar_number} created successfully"}

@app.route('/sandbox/matching', methods=['POST'])
def sandbox_matching():
    if 'logged_user' not in session:
        return {"status":"fail","message":"Not logged in"}, 401
    
    data = request.get_json()
    avatar1 = data.get('avatar1')
    avatar2 = data.get('avatar2')
    
    if not avatar1 or not avatar2:
        return {"status":"fail","message":"Both avatars are required"}, 400
    
    try:
        # Create temporary ObjectIds for sandbox avatars
        temp_id1 = ObjectId()
        temp_id2 = ObjectId()
        
        # Determine gender order for Matching class
        if avatar1['gender'] == 'male' and avatar2['gender'] == 'female':
            matchingResult = Matching(temp_id2, temp_id1)  # female_id, male_id
            matchingResult.female_info = avatar2
            matchingResult.male_info = avatar1
        elif avatar1['gender'] == 'female' and avatar2['gender'] == 'male':
            matchingResult = Matching(temp_id1, temp_id2)  # female_id, male_id
            matchingResult.female_info = avatar1
            matchingResult.male_info = avatar2
        else:
            # For same gender or other combinations, use first avatar as female, second as male for simulation
            matchingResult = Matching(temp_id1, temp_id2)
            matchingResult.female_info = avatar1
            matchingResult.male_info = avatar2
        
        # Override the database lookup in Matching class for sandbox mode
        def mock_get_user_info(user_id):
            if str(user_id) == str(temp_id1):
                return avatar1
            elif str(user_id) == str(temp_id2):
                return avatar2
            return None
        
        # Temporarily replace the database access
        original_method = matchingResult.get_user_info if hasattr(matchingResult, 'get_user_info') else None
        
        # Run simulation with sandbox data
        simulation_result, cumulative_rate = matchingResult.simulation()
        
        # Convert cumulative_rate to int safely
        try:
            cumulative_rate_int = int(cumulative_rate) if cumulative_rate else 25
        except:
            cumulative_rate_int = 25
        
        return {
            "status":"ok",
            "simulation": simulation_result,
            "cumulative_rate": cumulative_rate_int,
            "message": "Sandbox simulation completed successfully"
        }
        
    except Exception as e:
        print(f"Sandbox simulation error: {e}")
        import traceback
        traceback.print_exc()
        return {"status":"error","message":str(e)}, 500
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
            session.modified = True
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
        
        # Automatically log in the user after registration
        user = db.getCollection("Users").find_one({"email": data["email"]})
        if user:
            user["_id"] = str(user["_id"])
            session['logged_user'] = user
            session.modified = True
        
        return {"status":"ok"}
    except:
        return {"status":"fail","message":"System Error"}

@app.route('/logout', methods=['GET'])
def logout():
    session.clear()
    return redirect(url_for('login_register'))

@app.route('/get_user_info', methods=['GET'])
def get_user_info():
    try:
        if 'logged_user' not in session:
            return {"status":"not_logged_in"}, 401
        
        information = session['logged_user']
        print(information)
        return information
    except Exception as e:
        print(f"Get user info error: {e}")
        return {"status":"not_logged_in"}, 401
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
        session.modified = True
        return {"status":"ok"}
    except:
        return {"status":"fail","message":"System Error"}
    

if __name__ == "__main__":
    socketio.run(app,debug = True,port = 5001, host = '0.0.0.0')
    

    









