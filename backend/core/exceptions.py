from fastapi import Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    """Base class for application errors"""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

class NotFoundError(AppError):
    def __init__(self, message: str = "Ресурс не найден"):
        super().__init__(message, status_code=404)

class ValidationError(AppError):
    def __init__(self, message: str = "Ошибка валидации"):
        super().__init__(message, status_code=422)

class BusinessLogicError(AppError):
    def __init__(self, message: str = "Ошибка бизнес-логики"):
        super().__init__(message, status_code=400)

async def app_error_handler(request: Request, exc: AppError):
    """Global exception handler for AppError"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )
