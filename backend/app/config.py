import os

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./data.db')
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret')
ACCESS_TOKEN_EXPIRE_MINUTES = 60
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', '/app/uploads')
