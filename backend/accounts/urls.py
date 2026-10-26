from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf, name="api-csrf"),
    path("auth/signup/", views.signup, name="api-signup"),
    path("auth/login/", views.login_view, name="api-login"),
    path("auth/logout/", views.logout_view, name="api-logout"),
    path("auth/demo/", views.demo_login, name="api-demo"),
    path("auth/me/", views.me, name="api-me"),
    path("auth/password/", views.change_password, name="api-password"),
]
