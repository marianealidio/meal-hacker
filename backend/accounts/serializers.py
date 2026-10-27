import unicodedata

from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import DEMO_USERNAME, DIETS, INTOLERANCES, get_profile


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(max_length=60, allow_blank=True, required=False, trim_whitespace=True)
    diet = serializers.ChoiceField(choices=DIETS, required=False, allow_blank=True)
    intolerances = serializers.ListField(child=serializers.ChoiceField(choices=INTOLERANCES), required=False)
    onboarded = serializers.BooleanField(required=False)
    is_demo = serializers.BooleanField(read_only=True)

    def to_representation(self, user):
        p = get_profile(user)
        return {"id": user.id, "username": user.username, "display_name": p.display_name,
                "diet": p.diet, "intolerances": p.intolerances, "onboarded": p.onboarded,
                "is_demo": p.is_demo}

    def update(self, user, validated):
        p = get_profile(user)
        for field in ("display_name", "diet", "intolerances", "onboarded"):
            if field in validated:
                setattr(p, field, validated[field])
        p.save()
        return user


class SignupSerializer(serializers.Serializer):
    username = serializers.RegexField(r"^[A-Za-z0-9_.@+-]{3,150}$")
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        # Compare the form Django will store (NFKC), so look-alike names cannot slip past the checks.
        value = unicodedata.normalize("NFKC", value)
        # "demo" is reserved for the shared demo account, even before it exists.
        if value.lower() == DEMO_USERNAME or User.objects.filter(username__iexact=value).exists():
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
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class PasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": ["That isn't your current password."]})
        try:
            password_validation.validate_password(attrs["new_password"], user)
        except Exception as e:
            raise serializers.ValidationError({"new_password": list(getattr(e, "messages", [str(e)]))})
        return attrs
