import os

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./data.db')
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret')
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', '/app/uploads')
ARCHIVE_DIR = os.getenv('ARCHIVE_DIR', '/app/archives')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '')
VAPID_CLAIMS_EMAIL = os.getenv('VAPID_CLAIMS_EMAIL', 'admin@example.com')
