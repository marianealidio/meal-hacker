from typing import Optional

from django.http import Http404
from rest_framework import exceptions, status as http_status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_error(code: str, message: str, status: int, fields: Optional[dict] = None) -> Response:
    return Response({"error": {"code": code, "message": message, "fields": fields or {}}}, status=status)


def error_envelope_handler(exc, context):
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    response = exception_handler(exc, context)
    if response is None:
        return None
    if isinstance(exc, exceptions.ValidationError):
        detail = exc.detail if isinstance(exc.detail, dict) else {"non_field_errors": exc.detail}
        response.data = {"error": {"code": "invalid", "message": "Some fields need fixing.", "fields": detail}}
        response.status_code = http_status.HTTP_400_BAD_REQUEST
        return response
    code = getattr(exc, "default_code", "error")
    detail = getattr(exc, "detail", str(exc))
    response.data = {"error": {"code": str(getattr(detail, "code", code)), "message": str(detail), "fields": {}}}
    return response
