import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import tiktok_signatures as ts


class ParseCookiesTest(unittest.TestCase):
    def test_cookie_string(self):
        cookies = ts.parse_cookies("msToken=abc; sid_guard=x%7Cy; tt-target-idc=eu-ttp2")
        self.assertEqual(cookies, {"msToken": "abc", "sid_guard": "x%7Cy", "tt-target-idc": "eu-ttp2"})

    def test_json_export(self):
        raw = json.dumps([
            {"name": "msToken", "value": "abc"},
            {"name": "sid_guard", "value": "x"},
        ])
        self.assertEqual(ts.parse_cookies(raw), {"msToken": "abc", "sid_guard": "x"})

    def test_value_may_contain_equals(self):
        self.assertEqual(ts.parse_cookies("token=a=b==")["token"], "a=b==")

    def test_empty_and_malformed_parts_are_skipped(self):
        self.assertEqual(ts.parse_cookies(" ; novalue ; a=1 ;"), {"a": "1"})


class AddSignaturesToUrlTest(unittest.TestCase):
    def test_appends_signatures_to_existing_query(self):
        url = "https://www.tiktok.com/api/v1/feed?aid=1988&app_name=tiktok_web"
        result = ts.add_signatures_to_url(url, {"X-Bogus": "b/+=", "X-Gnarly": "g"})
        self.assertEqual(
            result,
            "https://www.tiktok.com/api/v1/feed?aid=1988&app_name=tiktok_web"
            "&X-Bogus=b%2F%2B%3D&X-Gnarly=g",
        )

    def test_url_without_query(self):
        result = ts.add_signatures_to_url("https://www.tiktok.com/api", {"X-Gnarly": "g"})
        self.assertEqual(result, "https://www.tiktok.com/api?X-Gnarly=g")


class ReadCookiesTest(unittest.TestCase):
    def test_reads_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "cookies.txt"
            path.write_text("msToken=fromfile", encoding="utf-8")
            with mock.patch.dict(os.environ, {}, clear=True):
                self.assertEqual(ts.read_cookies(str(path)), {"msToken": "fromfile"})

    def test_falls_back_to_env(self):
        with mock.patch.dict(os.environ, {"TIKTOK_COOKIES": "msToken=fromenv"}, clear=True):
            self.assertEqual(ts.read_cookies(None), {"msToken": "fromenv"})

    def test_no_source_returns_empty(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(ts.read_cookies(None), {})


if __name__ == "__main__":
    unittest.main()
