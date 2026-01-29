from app.db import engine
from app import models

def create():
    models.Base.metadata.create_all(bind=engine)

if __name__ == '__main__':
    create()
