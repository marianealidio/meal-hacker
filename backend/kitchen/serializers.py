from rest_framework import serializers

from .models import InventoryItem, Note
from .parsing import parse_quick_add


class InventoryItemSerializer(serializers.ModelSerializer):
    text = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=200)
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    days_left = serializers.IntegerField(read_only=True)
    expires_soon = serializers.BooleanField(read_only=True)
    expiry_date = serializers.DateField(required=False, allow_null=True, input_formats=["%Y-%m-%d"])

    class Meta:
        model = InventoryItem
        fields = ["id", "text", "name", "quantity", "unit", "category", "expiry_date",
                  "days_left", "expires_soon", "date_added"]
        read_only_fields = ["id", "date_added"]

    def validate(self, attrs):
        text = attrs.pop("text", None)
        if text is not None and not attrs.get("name"):
            qty, name = parse_quick_add(text)
            attrs["name"] = name
            attrs.setdefault("quantity", qty)
            if len(name) > 100:
                raise serializers.ValidationError({"name": ["Keep the name under 100 characters."]})
            if len(qty) > 50:
                raise serializers.ValidationError({"quantity": ["Keep the quantity under 50 characters."]})
        if "name" in attrs:
            attrs["name"] = " ".join(attrs["name"].split())
        creating = self.instance is None
        if (creating or "name" in attrs) and not attrs.get("name"):
            raise serializers.ValidationError({"name": ["Enter an ingredient name."]})
        return attrs


class NoteSerializer(serializers.ModelSerializer):
    note = serializers.CharField(max_length=5000, allow_blank=True, trim_whitespace=False)

    class Meta:
        model = Note
        fields = ["note", "updated_at"]
        read_only_fields = ["updated_at"]
