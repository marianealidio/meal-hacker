from django.contrib.auth.models import User
from django.db import models

DEMO_USERNAME = "demo"

# Values accepted by Spoonacular's `diet` and `intolerances` parameters
DIETS = ["", "vegetarian", "vegan", "pescetarian", "gluten free", "ketogenic", "paleo"]
INTOLERANCES = ["dairy", "egg", "gluten", "grain", "peanut", "seafood", "sesame",
                "shellfish", "soy", "sulfite", "tree nut", "wheat"]


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=60, blank=True)
    diet = models.CharField(max_length=20, blank=True, choices=[(d, d or "none") for d in DIETS])
    intolerances = models.JSONField(default=list, blank=True)
    onboarded = models.BooleanField(default=False)
    is_demo = models.BooleanField(default=False)
    demo_seeded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Profile for {self.user.username}"


def get_profile(user) -> Profile:
    # Single accessor: recreates the Profile if it was ever lost, instead of raising RelatedObjectDoesNotExist.
    return Profile.objects.get_or_create(user=user)[0]
