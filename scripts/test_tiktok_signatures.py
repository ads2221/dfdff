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
