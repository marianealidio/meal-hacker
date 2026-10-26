from rest_framework import serializers

from .models import FavouriteRecipe


class FavouriteSerializer(serializers.ModelSerializer):
    recipe_id = serializers.IntegerField(min_value=1)

    class Meta:
        model = FavouriteRecipe
        fields = ["recipe_id", "title", "image", "description", "created_at"]
        read_only_fields = ["title", "image", "description", "created_at"]
