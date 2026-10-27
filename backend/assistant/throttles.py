from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle

from accounts.models import get_profile


def _is_demo(request) -> bool:
    user = request.user
    return bool(user and user.is_authenticated and get_profile(user).is_demo)


class AssistantThrottle(ScopedRateThrottle):
    """The view's "assistant" scope, keyed per user, except that every visitor to the shared
    demo account is the same user, so demo requests are keyed by client IP instead."""

    def get_cache_key(self, request, view):
        if _is_demo(request):
            return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
        return super().get_cache_key(request, view)


class DemoGlobalThrottle(ScopedRateThrottle):
    """One shared bucket for all demo traffic, so IP rotation can't drain the Groq quota."""

    scope = "assistant_demo_global"

    def allow_request(self, request, view):
        if not _is_demo(request):
            return True
        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return SimpleRateThrottle.allow_request(self, request, view)

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": "all"}
