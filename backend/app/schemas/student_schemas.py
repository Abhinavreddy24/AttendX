from pydantic import BaseModel, EmailStr, ConfigDict


class StudentCreate(BaseModel):
    student_id: str
    name: str
    email: EmailStr
    department: str
    year: int


class StudentResponse(BaseModel):
    id: int
    student_id: str
    name: str
    email: EmailStr
    department: str
    year: int

    model_config = ConfigDict(from_attributes=True)