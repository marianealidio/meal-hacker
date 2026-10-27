from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from kitchen.models import InventoryItem
from meal_hacker.api_errors import api_error

from . import groq
from .throttles import AssistantThrottle, DemoGlobalThrottle


class MessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(min_length=1, max_length=1000)


class ChatSerializer(serializers.Serializer):
    messages = MessageSerializer(many=True, allow_empty=False, max_length=20)

    def validate_messages(self, value):
        if value[-1]["role"] != "user":
            raise serializers.ValidationError("The last message must come from you.")
        return value


class ChatView(APIView):
    throttle_classes = [AssistantThrottle, DemoGlobalThrottle]
    throttle_scope = "assistant"

    def post(self, request):
        s = ChatSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        inventory = list(InventoryItem.active_for(request.user).values_list("name", flat=True)[:40])
        try:
            reply = groq.chat([dict(m) for m in s.validated_data["messages"]], inventory)
        except groq.AssistantUnavailable:
            return api_error("assistant_unavailable", "The assistant can't answer right now. Try again soon.", 503)
        return Response({"reply": reply})
