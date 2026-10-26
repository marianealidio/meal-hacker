from django.contrib.auth.models import User

from .models import DEMO_USERNAME


def ensure_demo_user() -> User:
    user, created = User.objects.get_or_create(username=DEMO_USERNAME)
    if created or user.has_usable_password():
        user.set_unusable_password()
        user.save()
    profile = user.profile
    if not profile.is_demo:
        profile.is_demo = True
        profile.display_name = profile.display_name or "Guest chef"
        profile.onboarded = True
        profile.save()
    return user
