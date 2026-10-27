from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import InventoryItem, Note
from .serializers import InventoryItemSerializer, NoteSerializer


class InventoryList(generics.ListCreateAPIView):
    serializer_class = InventoryItemSerializer
    pagination_class = None

    def get_queryset(self):
        qs = InventoryItem.active_for(self.request.user)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InventoryDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InventoryItemSerializer
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return InventoryItem.objects.filter(user=self.request.user)


@api_view(["POST"])
def use_item(request, pk):
    item = get_object_or_404(InventoryItem, pk=pk, user=request.user)
    item.used_at = timezone.now()
    item.save(update_fields=["used_at", "updated_at"])
    return Response(InventoryItemSerializer(item).data)


@api_view(["GET", "PUT"])
def note(request):
    obj, _ = Note.objects.get_or_create(user=request.user)
    if request.method == "PUT":
        s = NoteSerializer(obj, data=request.data)
        s.is_valid(raise_exception=True)
        s.save()
    return Response(NoteSerializer(obj).data)
