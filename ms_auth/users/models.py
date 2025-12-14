from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLES = (
        ('ADMIN', 'Administrador'),
        ('GESTOR', 'Controla tienda'),
        ('CLIENTE', 'Usuario'),
    )
    
    email = models.EmailField(unique=True) 
    role = models.CharField(max_length=15, choices=ROLES, default='CLIENTE')
    """ TODO AGREGAR DIRECCIONES """
    
    USERNAME_FIELD = 'username' 
    REQUIRED_FIELDS = ['email', 'first_name'] 
    
    def __str__(self):
        return self.email