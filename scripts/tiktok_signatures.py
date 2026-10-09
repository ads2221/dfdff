#!/usr/bin/env python3
"""Генерирует подписи X-Gnarly, X-Bogus и X-Dynosaur для запроса к TikTok Web API.

Использует библиотеку https://github.com/n1tr00-10/tiktok-signature.

Пример:
    git clone https://github.com/n1tr00-10/tiktok-signature ~/tiktok-signature
    export TIKTOK_SIGNATURE_PATH=~/tiktok-signature
    python3 scripts/tiktok_signatures.py "https://www.tiktok.com/api/v1/feed?aid=1988&app_name=tiktok_web"

Вывод — JSON с подписями. В библиотеке x_bogus.py сейчас заглушка, которая
возвращает "1", поэтому X-Bogus будет невалидным (скрипт выведет предупреждение).
"""

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

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


def build_signatures(url: str, body: str, user_agent: str, lib_path: Path) -> dict:
    get_X_Gnarly, get_X_Bogus, get_X_Dynosaur = load_library(lib_path)
    # X-Gnarly и X-Dynosaur принимают только query-строку без "?", X-Bogus — полный URL
    query = urlsplit(url).query
    return {
        "X-Gnarly": get_X_Gnarly(query, body, user_agent, version="5.1.2"),
        "X-Bogus": get_X_Bogus(url, body, ""),
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
    args = parser.parse_args()

    if not args.lib_path:
        parser.error("укажите --lib-path или переменную окружения TIKTOK_SIGNATURE_PATH")

    signatures = build_signatures(
        args.url, args.body, args.user_agent, Path(args.lib_path).expanduser().resolve()
    )

    if signatures["X-Bogus"] == X_BOGUS_STUB_VALUE:
        print(
            'Предупреждение: x_bogus.py в библиотеке — заглушка (возвращает "1"), '
            "валидной подписи X-Bogus нет.",
            file=sys.stderr,
        )

    print(json.dumps(signatures, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
