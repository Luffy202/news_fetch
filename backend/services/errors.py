from __future__ import annotations


class ConflictError(ValueError):
    pass


class CrawlError(ValueError):
    pass


class ProxyConfigError(CrawlError):
    pass


class NetworkAccessError(CrawlError):
    pass


class WechatAuthError(CrawlError):
    pass


class WechatAPIError(CrawlError):
    pass
