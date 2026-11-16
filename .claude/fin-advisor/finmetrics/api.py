"""Клиент FinTree API по личному токену (только стандартная библиотека)."""

import json
import re
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import date
from urllib.parse import urlencode

PAGE_SIZE = 200  # максимум, который принимает API
RETRY_DELAYS = (2, 4, 8, 16)  # секунды между попытками; всего попыток = len + 1
MAX_MESSAGE_LENGTH = 4096
USER_AGENT = "fintree-advisor"


class ApiError(Exception):
    def __init__(self, message: str, transient: bool = False):
        super().__init__(message)
        self.transient = transient  # обрыв соединения / 5xx — имеет смысл повторить


class FinTreeClient:
    def __init__(self, base_url: str, token: str,
                 fetch: Callable[[str], object] | None = None,
                 post: Callable[[str, dict], None] | None = None,
                 put: Callable[[str, dict], None] | None = None,
                 sleep: Callable[[float], None] = time.sleep):
        self._base = base_url.rstrip("/")
        self._token = token
        self._sleep = sleep
        self._fetch = self._retrying(fetch or self._http_get)
        self._post = self._retrying(post or self._http_post)
        self._put = self._retrying(put or self._http_put)

    def _retrying(self, call):
        # Сеть облачных задач периодически рвёт соединения с сайтом — повторяем с паузой.
        def wrapper(*args):
            for delay in (*RETRY_DELAYS, None):
                try:
                    return call(*args)
                except ApiError as e:
                    if not e.transient or delay is None:
                        raise
                    self._sleep(delay)
        return wrapper

    def transactions(self, from_day: date) -> list[dict]:
        items: list[dict] = []
        page = 1
        while True:
            query = urlencode({"from": from_day.isoformat(), "page": page, "size": PAGE_SIZE})
            chunk = self._fetch(f"{self._base}/api/transaction?{query}")["items"]
            items.extend(chunk)
            if len(chunk) < PAGE_SIZE:
                return items
            page += 1

    def categories(self) -> dict[str, str]:
        return {c["id"]: c["name"] for c in self._fetch(f"{self._base}/api/users/categories")}

    def dashboard(self, year: int, month: int) -> dict:
        return self._fetch(f"{self._base}/api/analytics/dashboard?{urlencode({'year': year, 'month': month})}")

    def retrospectives(self) -> list[dict]:
        return self._fetch(f"{self._base}/api/retrospectives")

    def notify(self, text: str) -> None:
        """Отправить себе сообщение в Telegram обычным текстом (без HTML/Markdown)."""
        if not text.strip() or len(text) > MAX_MESSAGE_LENGTH:
            raise ValueError(f"Текст должен быть от 1 до {MAX_MESSAGE_LENGTH} символов")
        self._post(f"{self._base}/api/users/me/notify", {"text": text, "format": "Plain"})

    def put_retrospective(self, month: str, fields: dict) -> None:
        if not re.fullmatch(r"\d{4}-\d{2}", month):
            raise ValueError("Месяц должен быть в формате YYYY-MM")
        self._put(f"{self._base}/api/retrospectives/{month}", {**fields, "month": month})

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._token}", "Accept": "application/json", "User-Agent": USER_AGENT}

    def _http_get(self, url: str) -> object:
        return self._send(urllib.request.Request(url, headers=self._headers()), url, parse=True)

    def _http_post(self, url: str, body: dict) -> None:
        self._send_json("POST", url, body)

    def _http_put(self, url: str, body: dict) -> None:
        self._send_json("PUT", url, body)

    def _send_json(self, method: str, url: str, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(url, data=data, method=method,
                                         headers={**self._headers(), "Content-Type": "application/json"})
        self._send(request, url, parse=False)

    @staticmethod
    def _send(request: urllib.request.Request, url: str, parse: bool) -> object:
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response) if parse else None
        except urllib.error.HTTPError as e:
            raise ApiError(f"FinTree API ответил {e.code} на {url.split('?')[0]}",
                           transient=e.code in (502, 503, 504)) from None
        except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
            raise ApiError(f"FinTree API недоступен: {getattr(e, 'reason', e)}", transient=True) from None
