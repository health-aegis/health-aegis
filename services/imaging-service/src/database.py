from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@postgres:5432/aegis_imaging")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ImageRecord(Base):
    __tablename__ = "image_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    filename = Column(String)
    blob_url = Column(String)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Pending Analysis")
    diagnostic_report = Column(String, nullable=True)
