from pydantic import BaseModel, EmailStr, ConfigDict


class FacultyCreate(BaseModel):
    faculty_id: str
    name: str
    email: EmailStr
    department: str


class FacultyResponse(BaseModel):
    id: int
    faculty_id: str
    name: str
    email: EmailStr
    department: str

    model_config = ConfigDict(from_attributes=True)