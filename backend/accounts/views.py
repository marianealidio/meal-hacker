from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from meal_hacker.api_errors import api_error

from .demo import ensure_demo_user
from .models import get_profile
from .serializers import LoginSerializer, MeSerializer, PasswordSerializer, SignupSerializer

BACKEND = "django.contrib.auth.backends.ModelBackend"


def enforce_csrf(request):
    # DRF's api_view marks views csrf_exempt, so Django's csrf_protect is a no-op here.
    # Anonymous POSTs that create or end a session must check the token explicitly.
    SessionAuthentication().enforce_csrf(request)


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request):
    return Response({"csrfToken": get_token(request)})


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    enforce_csrf(request)
    s = SignupSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    user = s.save()
    login(request, user, backend=BACKEND)
    return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    enforce_csrf(request)
    s = LoginSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    user = authenticate(request, username=s.validated_data["username"], password=s.validated_data["password"])
    if user is None:
        return api_error("invalid_credentials", "That username and password don't match.", 400)
    login(request, user)
    return Response(MeSerializer(user).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    enforce_csrf(request)
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def demo_login(request):
    enforce_csrf(request)
    user = ensure_demo_user()
    login(request, user, backend=BACKEND)
    return Response(MeSerializer(user).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        if get_profile(request.user).is_demo:
            return api_error("demo_read_only", "The demo kitchen's profile can't be changed.", 403)
        s = MeSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
    return Response(MeSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    if get_profile(request.user).is_demo:
        return api_error("demo_read_only", "The demo kitchen's password can't be changed.", 403)
    s = PasswordSerializer(data=request.data, context={"request": request})
    s.is_valid(raise_exception=True)
    request.user.set_password(s.validated_data["new_password"])
    request.user.save()
    update_session_auth_hash(request, request.user)
    return Response(status=status.HTTP_204_NO_CONTENT)
