#!/usr/bin/env python3
"""Генерирует подписи X-Gnarly, X-Bogus и X-Dynosaur для запроса к TikTok Web API.

Использует библиотеку https://github.com/n1tr00-10/tiktok-signature.

Пример:
    git clone https://github.com/n1tr00-10/tiktok-signature ~/tiktok-signature
    export TIKTOK_SIGNATURE_PATH=~/tiktok-signature
    python3 scripts/tiktok_signatures.py "https://www.tiktok.com/api/v1/feed?aid=1988&app_name=tiktok_web" \
        --cookies ~/secrets/tiktok_cookies.json

Куки можно передать файлом (--cookies, JSON-массив из расширения браузера
или строка вида "name=value; name2=value2") либо переменной окружения TIKTOK_COOKIES.
Из них используется только msToken — он передаётся в X-Bogus.
Файлы с куками не храните в репозитории.

Вывод — JSON с подписями. В библиотеке x_bogus.py сейчас заглушка, которая
возвращает "1", поэтому X-Bogus будет невалидным (скрипт выведет предупреждение).
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
X_BOGUS_STUB_VALUE = "1"


def load_library(lib_path: Path):
    if not (lib_path / "x_gnarly.py").is_file():
        sys.exit(
            f"Библиотека не найдена в {lib_path}. Склонируйте: "
            "git clone https://github.com/n1tr00-10/tiktok-signature"
        )
    sys.path.insert(0, str(lib_path))
    from x_bogus import get_X_Bogus
    from x_dynosaur import get_X_Dynosaur
    from x_gnarly import get_X_Gnarly

    return get_X_Gnarly, get_X_Bogus, get_X_Dynosaur


def parse_cookies(raw: str) -> Dict[str, str]:
    raw = raw.strip()
    if raw.startswith("["):
        # JSON-экспорт кук из расширения браузера: список объектов с name и value
        return {cookie["name"]: cookie["value"] for cookie in json.loads(raw)}
    cookies = {}
    for part in raw.split(";"):
        name, sep, value = part.strip().partition("=")
        if sep:
            cookies[name] = value
    return cookies


def read_cookies(cookies_file: Optional[str]) -> Dict[str, str]:
    if cookies_file:
        return parse_cookies(Path(cookies_file).expanduser().read_text(encoding="utf-8"))
    env_value = os.environ.get("TIKTOK_COOKIES")
    return parse_cookies(env_value) if env_value else {}


def add_signatures_to_url(url: str, signatures: dict) -> str:
    # Предположение: подписи передаются query-параметрами с теми же именами.
    # Библиотека этого не описывает, поэтому проверяется режимом --check.
    parts = urlsplit(url)
    params = parse_qsl(parts.query, keep_blank_values=True)
    params += list(signatures.items())
    return urlunsplit(parts._replace(query=urlencode(params)))


def send_check_request(url: str, user_agent: str, cookies: Dict[str, str]) -> None:
    headers = {"User-Agent": user_agent, "Referer": "https://www.tiktok.com/"}
    if cookies:
        headers["Cookie"] = "; ".join(f"{name}={value}" for name, value in cookies.items())
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status, body = response.status, response.read(300)
    except urllib.error.HTTPError as error:
        status, body = error.code, error.read(300)
    print(f"HTTP {status}")
    print(body.decode("utf-8", errors="replace"))


def build_signatures(
    url: str, body: str, user_agent: str, ms_token: str, lib_path: Path
) -> dict:
    get_X_Gnarly, get_X_Bogus, get_X_Dynosaur = load_library(lib_path)
    # X-Gnarly и X-Dynosaur принимают только query-строку без "?", X-Bogus — полный URL
    query = urlsplit(url).query
    return {
        "X-Gnarly": get_X_Gnarly(query, body, user_agent, version="5.1.2"),
        "X-Bogus": get_X_Bogus(url, body, ms_token),
        "X-Dynosaur": get_X_Dynosaur(query, user_agent, body),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Генерация подписей TikTok Web API")
    parser.add_argument("url", help="полный URL запроса с query-строкой")
    parser.add_argument("--body", default="", help="тело запроса (для POST)")
    parser.add_argument("--user-agent", default=DEFAULT_USER_AGENT, help="User-Agent запроса")
    parser.add_argument(
        "--lib-path",
        default=os.environ.get("TIKTOK_SIGNATURE_PATH"),
        help="путь к клону библиотеки tiktok-signature (по умолчанию $TIKTOK_SIGNATURE_PATH)",
    )
    parser.add_argument(
        "--cookies",
        help="файл с куками (JSON или строка name=value; ...), по умолчанию $TIKTOK_COOKIES",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="отправить GET-запрос с подписями в query и куками, вывести HTTP-статус и начало ответа",
    )
    args = parser.parse_args()

    if not args.lib_path:
        parser.error("укажите --lib-path или переменную окружения TIKTOK_SIGNATURE_PATH")

    cookies = read_cookies(args.cookies)

    signatures = build_signatures(
        args.url,
        args.body,
        args.user_agent,
        cookies.get("msToken", ""),
        Path(args.lib_path).expanduser().resolve(),
    )

    if signatures["X-Bogus"] == X_BOGUS_STUB_VALUE:
        print(
            'Предупреждение: x_bogus.py в библиотеке — заглушка (возвращает "1"), '
            "валидной подписи X-Bogus нет.",
            file=sys.stderr,
        )

    print(json.dumps(signatures, ensure_ascii=False, indent=2))

    if args.check:
        send_check_request(
            add_signatures_to_url(args.url, signatures), args.user_agent, cookies
        )


if __name__ == "__main__":
    main()
