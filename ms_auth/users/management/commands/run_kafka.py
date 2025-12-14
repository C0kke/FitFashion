import json
import logging
from django.core.management.base import BaseCommand
from kafka import KafkaConsumer, KafkaProducer
import os
from users import kafka_services 

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

KAFKA_BROKER = os.environ.get('KAFKA_BROKER')
TOPIC_REQUEST = 'auth-request'
TOPIC_RESPONSE = 'auth-response'

class Command(BaseCommand):
    help = 'Inicia el consumidor de Kafka para autenticación'

    def handle(self, *args, **options):
        
        consumer = KafkaConsumer(
            TOPIC_REQUEST,
            bootstrap_servers=[KAFKA_BROKER],
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='django-auth-group',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )

        producer = KafkaProducer(
            bootstrap_servers=[KAFKA_BROKER],
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )

        ACTIONS = {
            'LOGIN': kafka_services.handle_login,
            'REGISTER': kafka_services.handle_register,
            'GET_PROFILE': kafka_services.handle_get_profile,
            'LIST_USERS': kafka_services.handle_list_users,
        }

        for message in consumer:
            try:
                data = message.value
                msg_type = data.get('type')
                correlation_id = data.get('correlationId')
                
                handler = ACTIONS.get(msg_type)

                if handler:
                    result_data = handler(data)
                else:
                    result_data = {'status': 400, 'msg': 'Acción no soportada'}

                result_data['correlationId'] = correlation_id

                producer.send(TOPIC_RESPONSE, value=result_data)
                producer.flush()

            except Exception as e:
                logger.error(f"Error crítico : {e}")