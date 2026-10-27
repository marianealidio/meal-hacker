from django.contrib.auth.models import User
from django.db import models


class RecipeCache(models.Model):
    key = models.CharField(max_length=64, unique=True)
    endpoint = models.CharField(max_length=100)
    payload = models.JSONField()
    fetched_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)

    def __str__(self):
        return f"{self.endpoint} ({self.key[:8]})"


class FavouriteRecipe(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favourites")
    recipe_id = models.PositiveIntegerField()
    title = models.CharField(max_length=200)
    image = models.URLField(max_length=500, blank=True)
    description = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "recipe_id"], name="unique_favourite")]

    def __str__(self):
        return self.title
