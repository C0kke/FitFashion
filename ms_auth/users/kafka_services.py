import logging
import json
from django.contrib.auth import authenticate, get_user_model
from rest_framework.authtoken.models import Token
from django.db import IntegrityError

logger = logging.getLogger(__name__)
User = get_user_model()

def get_user_from_token(token_header):
    if not token_header or "Token " not in token_header:
        return {'user': None, 'error': 'Token inválido o mal formado'}
    try:
        key = token_header.split(" ")[1]
        token_obj = Token.objects.get(key=key)
        return {'user': token_obj.user, 'error': None}
    except (Token.DoesNotExist, IndexError):
        return {'user': None, 'error': 'Token no encontrado'}
    
def handle_login(data):
    username = data.get('username')
    password = data.get('password')
    
    user = authenticate(username=username, password=password)

    if user is not None:
        if user.is_active:
            token, created = Token.objects.get_or_create(user=user)
            return {
                'status': 200,
                'msg': 'Login Exitoso',
                'auth_token': token.key,
                'role': getattr(user, 'role', 'user'),
                'username': user.username,
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name
            }
        else:
            return {'status': 403, 'msg': 'Usuario inactivo'}
    return {'status': 401, 'msg': 'Credenciales inválidas'}

def handle_register(data):
    try:
        if User.objects.filter(username=data.get('username')).exists():
            return {'status': 400, 'msg': 'El nombre de usuario ya existe'}
        
        if User.objects.filter(email=data.get('email')).exists():
            return {'status': 400, 'msg': 'El correo ya está registrado'}

        new_user = User.objects.create_user(
            username=data.get('username'),
            email=data.get('email'),
            password=data.get('password'),
            first_name=data.get('first_name', ''),
            role='CLIENTE'
        )
        token, _ = Token.objects.get_or_create(user=new_user)
        
        return {
            'status': 201, 
            'msg': 'Usuario creado', 
            'token': token.key,
            'username': new_user.username,
            'id': new_user.id
        }
    except Exception as e:
        logger.error(f"Error registro: {e}")
        return {'status': 500, 'msg': str(e)}

def handle_get_profile(data):
    try:
        token_header = data.get('token')
        
        if not token_header:
             return {'status': 400, 'msg': 'Token no proporcionado'}

        key = token_header.replace('Token ', '').strip()

        try:
            token_obj = Token.objects.get(key=key)
            user = token_obj.user
        except Token.DoesNotExist:
            return {'status': 401, 'msg': 'Token inválido'}

        return {
            'status': 200,
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'role': getattr(user, 'role', 'user'),
            'date_joined': str(user.date_joined)
        }
    except Exception as e:
        return {'status': 500, 'msg': str(e)}

def handle_list_users(data):
    try:
        users = User.objects.all().values('id', 'first_name', 'username', 'email', 'role')
        user_list = list(users)
        
        return {
            'status': 200,
            'count': len(user_list),
            'results': user_list
        }
    except Exception as e:
        return {'status': 500, 'msg': str(e)}

def handle_update_profile(message_data):
    try:
        token_header = message_data.get('token')
        payload = message_data.get('data')

        if not token_header:
            return {'status': 401, 'msg': 'No autorizado (Token faltante)'}

        key = token_header.replace('Token ', '').strip()

        try:
            token_obj = Token.objects.get(key=key)
            user = token_obj.user
        except Token.DoesNotExist:
            return {'status': 401, 'msg': 'Token inválido'}

        if 'first_name' in payload:
            user.first_name = payload['first_name']
        
        if 'email' in payload:
            user.email = payload['email']
            
        if 'username' in payload:
            user.username = payload['username']

        try:
            user.save()
        except IntegrityError:
            return {'status': 400, 'msg': 'El nombre de usuario o email ya está en uso por otra cuenta.'}

        return {
            'status': 200,
            'msg': 'Perfil actualizado correctamente',
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'role': getattr(user, 'role', 'user')
        }

    except Exception as e:
        logger.error(f"Error update profile: {e}")
        return {'status': 500, 'msg': str(e)}

def handle_admin_update_user(message_data):
    try:
        admin_token = message_data.get('admin_token')
        target_id = message_data.get('target_id')
        payload = message_data.get('data')

        res_admin = get_user_from_token(admin_token)
        if not res_admin['user']:
            return {'status': 401, 'msg': 'Token inválido'}
        
        requesting_user = res_admin['user']
        if getattr(requesting_user, 'role', 'CLIENTE') != 'ADMIN':
            return {'status': 403, 'msg': 'No tienes permisos de administrador'}

        try:
            target_user = User.objects.get(pk=target_id)
        except User.DoesNotExist:
            return {'status': 404, 'msg': 'Usuario no encontrado'}

        if 'first_name' in payload:
            target_user.first_name = payload['first_name']
        if 'email' in payload:
            target_user.email = payload['email']
        if 'username' in payload:
            target_user.username = payload['username']
        if 'role' in payload:
            target_user.role = payload['role']
        if 'password' in payload and payload['password']:
            target_user.set_password(payload['password'])

        target_user.save()

        return {
            'status': 200,
            'msg': f'Usuario {target_user.username} actualizado correctamente'
        }

    except Exception as e:
        logger.error(f"Error admin update: {e}")
        return {'status': 500, 'msg': str(e)}
    
def handle_auth_request(message):
    try:
        data = message.value 
        msg_type = data.get('type')
        correlation_id = data.get('correlationId')
        print(f"DEBUG: Recibido mensaje tipo: {msg_type}")
        response = {'status': 400, 'msg': 'Acción no soportada'}

        if msg_type == 'LOGIN':
            response = handle_login(data)
        
        elif msg_type == 'REGISTER':
            response = handle_register(data)
        
        elif msg_type == 'GET_PROFILE':
            response = handle_get_profile(data)
            
        elif msg_type == 'LIST_USERS':
            response = handle_list_users(data)
            
        elif msg_type == 'UPDATE_PROFILE':
            response = handle_update_profile(data)

        elif msg_type == 'ADMIN_UPDATE_USER':
                response = handle_admin_update_user(data)

        response['correlationId'] = correlation_id
        return response

    except Exception as e:
        logger.error(f"Error crítico en dispatcher: {e}")
        return {
            'status': 500, 
            'msg': 'Error interno del servidor',
            'correlationId': data.get('correlationId') if 'data' in locals() else None
        }