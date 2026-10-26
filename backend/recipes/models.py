from django.db import models


class RecipeCache(models.Model):
    key = models.CharField(max_length=64, unique=True)
    endpoint = models.CharField(max_length=100)
    payload = models.JSONField()
    fetched_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)

    def __str__(self):
        return f"{self.endpoint} ({self.key[:8]})"
