"""遗留测试兼容入口。"""

import sys
import unittest


LEGACY_TEST_MODULES = [
    'backend.tests.test_wechat_fetcher',
    'backend.tests.test_article_parser',
    'backend.tests.test_article_summarizer',
    'backend.tests.test_feishu_and_compat',
]


def build_legacy_suite() -> unittest.TestSuite:
    suite = unittest.TestSuite()
    for module_name in LEGACY_TEST_MODULES:
        suite.addTests(unittest.defaultTestLoader.loadTestsFromName(module_name))
    return suite


def load_tests(loader, tests, pattern):
    if pattern is None:
        return build_legacy_suite()
    return tests


if __name__ == '__main__':
    runner = unittest.TextTestRunner()
    raise SystemExit(not runner.run(build_legacy_suite()).wasSuccessful())
