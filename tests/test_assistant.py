import json
import unittest
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from unittest.mock import patch

from cms_ai_assistant import CMSAIAssistant, CMSContent
from cms_ai_assistant.cli import main


class CMSContentTests(unittest.TestCase):
    def test_builds_content_from_mapping(self) -> None:
        content = CMSContent.from_mapping(
            {
                "id": "article-1",
                "title": "A practical guide to CMS workflows",
                "body": "This article explains practical CMS workflows. " * 20,
                "summary": "A practical summary for CMS teams.",
                "metadata": {"keywords": ["CMS"]},
            }
        )

        self.assertEqual(content.content_id, "article-1")
        self.assertEqual(content.metadata["keywords"], ["CMS"])

    def test_requires_title_and_body(self) -> None:
        with self.assertRaisesRegex(ValueError, "Missing required field: body"):
            CMSContent.from_mapping({"title": "Only a title"})


class CMSAIAssistantTests(unittest.TestCase):
    def test_analyze_returns_prioritized_suggestions(self) -> None:
        content = CMSContent.from_mapping(
            {
                "title": "Short",
                "body": "This is too short.",
                "metadata": {"keywords": ["missing-keyword"]},
            }
        )

        suggestions = CMSAIAssistant().analyze(content)

        self.assertEqual(suggestions[0].severity, "critical")
        self.assertEqual(suggestions[0].field, "body")
        self.assertTrue(any(suggestion.field == "summary" for suggestion in suggestions))

    def test_analysis_report_is_serializable(self) -> None:
        content = CMSContent.from_mapping(
            {
                "id": "article-2",
                "title": "A detailed CMS launch checklist",
                "body": "CMS launch planning keeps teams aligned. " * 35,
                "summary": "A checklist for launching CMS content with confidence.",
                "metadata": {"keywords": ["CMS"]},
            }
        )

        report = CMSAIAssistant().analysis_report(content)

        self.assertEqual(report["content_id"], "article-2")
        self.assertGreaterEqual(report["score"], 0)
        json.dumps(report)


class CLITests(unittest.TestCase):
    def test_main_reads_json_from_stdin(self) -> None:
        payload = {
            "title": "A detailed CMS launch checklist",
            "body": "CMS launch planning keeps teams aligned. " * 35,
            "summary": "A checklist for launching CMS content with confidence.",
            "metadata": {"keywords": ["CMS"]},
        }
        stdout = StringIO()

        with patch("sys.stdin", StringIO(json.dumps(payload))):
            with redirect_stdout(stdout):
                exit_code = main(["-"])

        self.assertEqual(exit_code, 0)
        report = json.loads(stdout.getvalue())
        self.assertIn("suggestions", report)

    def test_main_reports_validation_errors(self) -> None:
        stdout = StringIO()
        stderr = StringIO()

        with patch("sys.stdin", StringIO("{}")):
            with redirect_stderr(stderr), redirect_stdout(stdout):
                exit_code = main(["-"])

        self.assertEqual(exit_code, 1)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("Missing required field: title", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
