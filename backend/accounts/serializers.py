from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import DIETS, INTOLERANCES


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(max_length=60, allow_blank=True, required=False, trim_whitespace=True)
    diet = serializers.ChoiceField(choices=DIETS, required=False, allow_blank=True)
    intolerances = serializers.ListField(child=serializers.ChoiceField(choices=INTOLERANCES), required=False)
    onboarded = serializers.BooleanField(required=False)
    is_demo = serializers.BooleanField(read_only=True)

    def to_representation(self, user):
        p = user.profile
        return {"id": user.id, "username": user.username, "display_name": p.display_name,
                "diet": p.diet, "intolerances": p.intolerances, "onboarded": p.onboarded,
                "is_demo": p.is_demo}

    def update(self, user, validated):
        p = user.profile
        for field in ("display_name", "diet", "intolerances", "onboarded"):
            if field in validated:
                setattr(p, field, validated[field])
        p.save()
        return user


class SignupSerializer(serializers.Serializer):
    username = serializers.RegexField(r"^[\w.@+-]{3,150}$")
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is taken. Try another.")
        return value

    def validate(self, attrs):
        try:
            password_validation.validate_password(attrs["password"], User(username=attrs["username"]))
        except Exception as e:  # django ValidationError
            raise serializers.ValidationError({"password": list(getattr(e, "messages", [str(e)]))})
        return attrs

    def create(self, validated):
        return User.objects.create_user(validated["username"], password=validated["password"])


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class PasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": ["That isn't your current password."]})
        try:
            password_validation.validate_password(attrs["new_password"], user)
        except Exception as e:
            raise serializers.ValidationError({"new_password": list(getattr(e, "messages", [str(e)]))})
        return attrs
