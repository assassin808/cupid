from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from datetime import datetime
from Database import dbClient
import json

socketio = SocketIO()

# 存储在线用户
online_users = {}

@socketio.on('connect')
def handle_connect():
    user_id = request.args.get('userId')
    if user_id:
        online_users[user_id] = request.sid
        join_room(user_id)
        print(f"User {user_id} connected with sid {request.sid}")
        # 通知用户连接成功
        emit('connection_status', {'status': 'connected'}, room=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    user_id = None
    for uid, sid in online_users.items():
        if sid == request.sid:
            user_id = uid
            break
    
    if user_id:
        del online_users[user_id]
        leave_room(user_id)
        print(f"User {user_id} disconnected")

@socketio.on('typing')
def handle_typing(data):
    try:
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        is_typing = data.get('is_typing')
        
        if not all([sender_id, receiver_id, is_typing is not None]):
            return
        
        # 创建打字状态消息
        typing_status = {
            'sender_id': sender_id,
            'is_typing': is_typing
        }
        
        # 发送打字状态给接收者
        if receiver_id in online_users:
            emit('typing_status', typing_status, room=online_users[receiver_id])
            
    except Exception as e:
        print(f"Error handling typing status: {str(e)}")

@socketio.on('send_message')
def handle_message(data):
    try:
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        content = data.get('content')
        
        print(f"Received message from {sender_id} to {receiver_id}: {content}")
        
        if not all([sender_id, receiver_id, content]):
            emit('error', {'message': 'Missing required message data'}, room=request.sid)
            return
        
        # 创建消息对象
        message = {
            'sender_id': sender_id,
            'receiver_id': receiver_id,
            'content': content,
            'timestamp': datetime.now().isoformat()
        }
        
        # 发送消息给接收者
        if receiver_id in online_users:
            print(f"Sending message to receiver {receiver_id} at {online_users[receiver_id]}")
            emit('new_message', message, room=online_users[receiver_id])
        else:
            print(f"User {receiver_id} is offline")
        
        # 发送消息给发送者（用于确认）
        if sender_id in online_users:
            print(f"Sending confirmation to sender {sender_id} at {online_users[sender_id]}")
            emit('new_message', message, room=online_users[sender_id])
        
        # 这里可以添加消息持久化逻辑
        # 例如将消息保存到数据库
        db = dbClient()
        try:
            db.getCollection("chat-history").update_one(
                {"sender_id": sender_id, "chat.receiver_id": receiver_id},
                {"$push": {"chat.$.content": {"type": "sent", "message": message["content"], "timestamp": message["timestamp"]}}},
                upsert=True
            )
        except Exception as e:
            db.getCollection("chat-history").update_one(
                {"sender_id": sender_id},
                {"$push": {"chat": {"receiver_id": receiver_id, "content": []}}},
                upsert=True
            )
            db.getCollection("chat-history").update_one(
                {"sender_id": sender_id, "chat.receiver_id": receiver_id},
                {"$push": {"chat.$.content": {"type": "sent", "message": message["content"], "timestamp": message["timestamp"]}}},
                upsert=True
            )
        
        try:
            db.getCollection("chat-history").update_one(
                {"sender_id": receiver_id, "chat.receiver_id": sender_id},
                {"$push": {"chat.$.content": {"type": "received", "message": message["content"], "timestamp": message["timestamp"]}}},
                upsert=True
            )
        except Exception as e:
            db.getCollection("chat-history").update_one(
                {"sender_id": receiver_id},
                {"$push": {"chat": {"receiver_id": sender_id, "content": []}}},
                upsert=True
            )
            db.getCollection("chat-history").update_one(
                {"sender_id": receiver_id, "chat.receiver_id": sender_id},
                {"$push": {"chat.$.content": {"type": "received", "message": message["content"], "timestamp": message["timestamp"]}}},
                upsert=True
            )
    except Exception as e:
        print(f"Error saving message to database: {str(e)}")
        emit('error', {'message': 'Failed to send message'}, room=request.sid)

@socketio.on('start_sandbox_simulation')
def handle_sandbox_simulation(data):
    """Handle real-time sandbox simulation with streaming updates"""
    try:
        from bson.objectid import ObjectId
        from utils import Matching
        import traceback
        
        avatar1 = data.get('avatar1')
        avatar2 = data.get('avatar2')
        user_sid = request.sid
        
        if not avatar1 or not avatar2:
            emit('simulation_error', {'message': 'Both avatars are required'}, room=user_sid)
            return
        
        # Emit start event
        emit('simulation_started', {'message': 'AI simulation starting...'}, room=user_sid)
        
        # Create temporary ObjectIds
        temp_id1 = ObjectId()
        temp_id2 = ObjectId()
        
        # Determine gender order for Matching class
        if avatar1['gender'] == 'male' and avatar2['gender'] == 'female':
            matchingResult = Matching(temp_id2, temp_id1)
            matchingResult.female_info = avatar2
            matchingResult.male_info = avatar1
        elif avatar1['gender'] == 'female' and avatar2['gender'] == 'male':
            matchingResult = Matching(temp_id1, temp_id2)
            matchingResult.female_info = avatar1
            matchingResult.male_info = avatar2
        else:
            matchingResult = Matching(temp_id1, temp_id2)
            matchingResult.female_info = avatar1
            matchingResult.male_info = avatar2
        
        # Pass socketio and sid for streaming updates
        matchingResult.socketio = socketio
        matchingResult.user_sid = user_sid
        
        # Run simulation
        simulation_result, cumulative_rate = matchingResult.simulation()
        
        # Convert rate safely
        try:
            cumulative_rate_int = int(cumulative_rate) if cumulative_rate else 25
        except:
            cumulative_rate_int = 25
        
        # Emit completion
        emit('simulation_completed', {
            'simulation': simulation_result,
            'cumulative_rate': cumulative_rate_int,
            'message': 'Simulation completed successfully!'
        }, room=user_sid)
        
    except Exception as e:
        print(f"Sandbox simulation error: {e}")
        traceback.print_exc()
        emit('simulation_error', {'message': str(e)}, room=user_sid) 