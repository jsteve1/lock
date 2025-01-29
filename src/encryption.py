from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

def generate_key_from_password(password: str, salt: bytes = None) -> tuple[bytes, bytes]:
    """Generate a Fernet key from a password using PBKDF2."""
    if salt is None:
        salt = os.urandom(16)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = kdf.derive(password.encode())
    # Ensure key is properly formatted for Fernet (32 bytes, url-safe base64-encoded)
    key = base64.urlsafe_b64encode(key)
    return key, salt

def encrypt_data(data: str | bytes, key: bytes, is_binary: bool = False) -> str | bytes:
    """Encrypt data using Fernet symmetric encryption."""
    if not isinstance(key, bytes):
        key = key.encode()
    
    # Ensure key is properly padded for Fernet
    key = key + b'=' * (-len(key) % 4)
    
    f = Fernet(key)
    
    # Handle binary data
    if is_binary:
        if isinstance(data, str):
            data = data.encode()
        encrypted = f.encrypt(data)
        return encrypted  # Return bytes for binary data
    
    # Handle text data
    if isinstance(data, bytes):
        data = data.decode()
    return f.encrypt(data.encode()).decode()  # Return string for text data

def decrypt_data(encrypted_data: str | bytes, key: bytes, is_binary: bool = False) -> str | bytes:
    """Decrypt data using Fernet symmetric encryption."""
    if not isinstance(key, bytes):
        key = key.encode()
    
    # Ensure key is properly padded for Fernet
    key = key + b'=' * (-len(key) % 4)
    
    f = Fernet(key)
    
    # Handle binary data
    if is_binary:
        if isinstance(encrypted_data, str):
            encrypted_data = encrypted_data.encode()
        return f.decrypt(encrypted_data)  # Return bytes for binary data
    
    # Handle text data
    if isinstance(encrypted_data, bytes):
        encrypted_data = encrypted_data.decode()
    return f.decrypt(encrypted_data.encode()).decode()  # Return string for text data

class EncryptedField:
    """A descriptor for handling encrypted fields in SQLAlchemy models."""
    
    def __init__(self, key_field: str, is_binary: bool = False):
        self.key_field = key_field.split('.')  # Split the key path into parts
        self.name = None
        self.is_binary = is_binary

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        encrypted_value = getattr(instance, f'_{self.name}')
        if encrypted_value is None:
            return None
        
        try:
            # Navigate through the object hierarchy to get the key
            obj = instance
            for attr in self.key_field:
                if obj is None:
                    return None
                obj = getattr(obj, attr)
            key = obj  # Final attribute is the key
            
            if key is None:
                return None
            
            # Ensure key is properly formatted
            if not isinstance(key, bytes):
                key = key.encode()
            
            # Add padding if needed
            key = key + b'=' * (-len(key) % 4)
            
            # For binary data, the encrypted value might be stored as bytes
            if self.is_binary and isinstance(encrypted_value, bytes):
                return decrypt_data(encrypted_value, key, is_binary=True)
            
            return decrypt_data(encrypted_value, key, is_binary=self.is_binary)
        except Exception as e:
            print(f"Error decrypting {self.name}: {str(e)}")
            return None

    def __set__(self, instance, value):
        if value is None:
            setattr(instance, f'_{self.name}', None)
            return
        
        try:
            # Navigate through the object hierarchy to get the key
            obj = instance
            for attr in self.key_field:
                if obj is None:
                    raise ValueError("Cannot encrypt value: encryption key not available")
                obj = getattr(obj, attr)
            key = obj  # Final attribute is the key
            
            if key is None:
                raise ValueError("Cannot encrypt value: encryption key not available")
            
            # Ensure key is properly formatted
            if not isinstance(key, bytes):
                key = key.encode()
            
            # Add padding if needed
            key = key + b'=' * (-len(key) % 4)
            
            # For binary data, store the encrypted value directly as bytes
            encrypted_value = encrypt_data(value, key, is_binary=self.is_binary)
            setattr(instance, f'_{self.name}', encrypted_value)
        except Exception as e:
            print(f"Error encrypting {self.name}: {str(e)}")
            setattr(instance, f'_{self.name}', None) 