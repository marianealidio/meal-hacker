from rest_framework.throttling import ScopedRateThrottle


class AuthRateThrottle(ScopedRateThrottle):
    """ScopedRateThrottle pinned to the "auth" scope.

    Function views built with @api_view cannot set ``throttle_scope``, so the scope lives here.
    Anonymous callers are keyed by IP (ScopedRateThrottle's default for anonymous requests).
    """

    scope = "auth"

    def allow_request(self, request, view):
        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super(ScopedRateThrottle, self).allow_request(request, view)
