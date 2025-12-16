from django.test import TestCase
import json
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from users import kafka_services
from django.core.management import call_command

User = get_user_model()

class KafkaServicesTest(TestCase):
    def setUp(self):
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'password123',
            'first_name': 'Test'
        }
        self.user = User.objects.create_user(**self.user_data)
        self.token, _ = Token.objects.get_or_create(user=self.user)
        
        self.admin_user = User.objects.create_user(
            username='admin', 
            email='admin@example.com', 
            password='adminpass', 
            role='ADMIN'
        )
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin_user)

    def test_handle_login_success(self):
        data = {'username': 'testuser', 'password': 'password123'}
        response = kafka_services.handle_login(data)
        self.assertEqual(response['status'], 200)
        self.assertIn('token', response)
        self.assertEqual(response['user']['email'], 'test@example.com')

    def test_handle_login_invalid_creds(self):
        data = {'username': 'testuser', 'password': 'wrongpassword'}
        response = kafka_services.handle_login(data)
        self.assertEqual(response['status'], 401)

    def test_handle_register_success(self):
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'newpass',
            'first_name': 'New'
        }
        response = kafka_services.handle_register(data)
        self.assertEqual(response['status'], 201)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_handle_register_duplicate(self):
        response = kafka_services.handle_register(self.user_data)
        self.assertEqual(response['status'], 400)

    def test_handle_get_profile_success(self):
        data = {'token': f'Token {self.token.key}'}
        response = kafka_services.handle_get_profile(data)
        self.assertEqual(response['status'], 200)
        self.assertEqual(response['user']['username'], 'testuser')

    def test_handle_get_profile_invalid_token(self):
        data = {'token': 'Token invalidtoken123'}
        response = kafka_services.handle_get_profile(data)
        self.assertEqual(response['status'], 401)

    def test_admin_update_user_success(self):
        data = {
            'admin_token': f'Token {self.admin_token.key}',
            'target_id': self.user.id,
            'data': {'first_name': 'Updated Name'}
        }
        response = kafka_services.handle_admin_update_user(data)
        self.assertEqual(response['status'], 200)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated Name')

    def test_admin_update_user_forbidden(self):
        data = {
            'admin_token': f'Token {self.token.key}',
            'target_id': self.admin_user.id,
            'data': {'first_name': 'Hacker'}
        }
        response = kafka_services.handle_admin_update_user(data)
        self.assertEqual(response['status'], 403)

    def test_set_password_success(self):
        data = {
            'token': f'Token {self.token.key}',
            'current_password': 'password123',
            'new_password': 'newpassword123',
            're_new_password': 'newpassword123'
        }
        response = kafka_services.handle_set_password(data)
        self.assertEqual(response['status'], 200)
        
        login_check = kafka_services.handle_login({'username': 'testuser', 'password': 'newpassword123'})
        self.assertEqual(login_check['status'], 200)

# Test para comnado run_kafka
class KafkaCommandTest(TestCase):  
    @patch('users.management.commands.run_kafka.KafkaProducer')
    @patch('users.management.commands.run_kafka.KafkaConsumer')
    def test_command_routes_login(self, MockConsumer, MockProducer):
        mock_message = MagicMock()
        mock_message.value = {
            'type': 'LOGIN',
            'username': 'testuser',
            'password': 'password123',
            'correlationId': '12345'
        }
        
        mock_consumer_instance = MockConsumer.return_value
        mock_consumer_instance.__iter__.return_value = [mock_message]
        mock_producer_instance = MockProducer.return_value

        User.objects.create_user(username='testuser', password='password123')

        call_command('run_kafka')

        self.assertTrue(mock_producer_instance.send.called)
        
        call_args = mock_producer_instance.send.call_args
        response_data = call_args.kwargs['value']
        
        self.assertEqual(response_data['status'], 200)
        self.assertEqual(response_data['correlationId'], '12345')
        self.assertEqual(response_data['msg'], 'Login Exitoso')
