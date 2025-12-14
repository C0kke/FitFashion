import logging
from django.contrib.auth import authenticate, get_user_model
from rest_framework.authtoken.models import Token

logger = logging.getLogger(__name__)
User = get_user_model()

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
                'username': user.username
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
            first_name=data.get('first_name')
        )
        return {
            'status': 201, 
            'msg': 'Usuario creado', 
            'username': new_user.username,
            'id': new_user.id
        }
    except Exception as e:
        logger.error(f"Error registro: {e}")
        return {'status': 500, 'msg': str(e)}

def handle_get_profile(data):
    try:
        token_key = data.get('token')
        if token_key:
            try:
                token_obj = Token.objects.get(key=token_key)
                user = token_obj.user
            except Token.DoesNotExist:
                return {'status': 401, 'msg': 'Token inválido'}
        
        elif data.get('username'):
            try:
                user = User.objects.get(username=data.get('username'))
            except User.DoesNotExist:
                return {'status': 404, 'msg': 'Usuario no encontrado'}
        else:
            return {'status': 400, 'msg': 'Faltan datos (token o username)'}

        return {
            'status': 200,
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
        users = User.objects.all().values('username', 'email', 'role')
        user_list = list(users)
        
        return {
            'status': 200,
            'count': len(user_list),
            'results': user_list
        }
    except Exception as e:
        return {'status': 500, 'msg': str(e)}