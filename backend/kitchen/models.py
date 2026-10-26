from datetime import timedelta
from typing import Optional

from django.contrib.auth.models import User
from django.db import models
from django.db.models import F
from django.utils import timezone


class InventoryItem(models.Model):
    CATEGORIES = [("Fridge", "Fridge"), ("Pantry", "Pantry"), ("Freezer", "Freezer")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="inventory")
    name = models.CharField(max_length=100)
    quantity = models.CharField(max_length=50, blank=True)
    unit = models.CharField(max_length=20, blank=True)
    category = models.CharField(max_length=10, choices=CATEGORIES, default="Fridge")
    expiry_date = models.DateField(null=True, blank=True)
    date_added = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = [F("expiry_date").asc(nulls_last=True), "name"]

    @classmethod
    def active_for(cls, user):
        return cls.objects.filter(user=user, used_at__isnull=True)

    def expires_soon(self) -> bool:
        if self.expiry_date:
            return self.expiry_date <= timezone.localdate() + timedelta(days=3)
        return False

    def days_left(self) -> Optional[int]:
        if not self.expiry_date:
            return None
        return (self.expiry_date - timezone.localdate()).days

    def __str__(self):
        return self.name


class Note(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="note")
    note = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note for {self.user.username}"
