"""Core content analysis primitives for the CMS AI assistant."""

from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Any, Iterable, Literal

Severity = Literal["info", "warning", "critical"]


@dataclass(frozen=True)
class CMSContent:
    """A CMS content item that can be analyzed by the assistant."""

    title: str
    body: str
    summary: str = ""
    content_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_mapping(cls, payload: dict[str, Any]) -> "CMSContent":
        """Build content from a JSON-like mapping."""

        try:
            title = payload["title"]
            body = payload["body"]
        except KeyError as exc:
            missing = exc.args[0]
            raise ValueError(f"Missing required field: {missing}") from exc

        if not isinstance(title, str) or not title.strip():
            raise ValueError("Field 'title' must be a non-empty string")
        if not isinstance(body, str) or not body.strip():
            raise ValueError("Field 'body' must be a non-empty string")

        summary = payload.get("summary", "")
        if summary is None:
            summary = ""
        if not isinstance(summary, str):
            raise ValueError("Field 'summary' must be a string when provided")

        content_id = payload.get("id") or payload.get("content_id")
        if content_id is not None and not isinstance(content_id, str):
            raise ValueError("Field 'id' must be a string when provided")

        metadata = payload.get("metadata", {})
        if metadata is None:
            metadata = {}
        if not isinstance(metadata, dict):
            raise ValueError("Field 'metadata' must be an object when provided")

        return cls(
            title=title.strip(),
            body=body.strip(),
            summary=summary.strip(),
            content_id=content_id,
            metadata=metadata,
        )


@dataclass(frozen=True)
class Suggestion:
    """A structured editorial recommendation."""

    severity: Severity
    field: str
    message: str
    action: str

    def as_dict(self) -> dict[str, str]:
        return {
            "severity": self.severity,
            "field": self.field,
            "message": self.message,
            "action": self.action,
        }


@dataclass(frozen=True)
class AssistantConfig:
    """Thresholds used by the deterministic assistant."""

    min_title_length: int = 20
    max_title_length: int = 70
    min_body_words: int = 150
    min_summary_length: int = 50
    max_summary_length: int = 160
    max_sentence_words: int = 35
    min_keyword_mentions: int = 1


class CMSAIAssistant:
    """Analyze CMS content and return prioritized editorial suggestions."""

    def __init__(self, config: AssistantConfig | None = None) -> None:
        self.config = config or AssistantConfig()

    def analyze(self, content: CMSContent) -> list[Suggestion]:
        """Return suggestions ordered by severity and field."""

        suggestions: list[Suggestion] = []
        suggestions.extend(self._title_suggestions(content.title))
        suggestions.extend(self._body_suggestions(content.body))
        suggestions.extend(self._summary_suggestions(content.summary))
        suggestions.extend(self._metadata_suggestions(content))
        return sorted(suggestions, key=self._sort_key)

    def analysis_report(self, content: CMSContent) -> dict[str, Any]:
        """Return a serializable report for a content item."""

        suggestions = self.analyze(content)
        return {
            "content_id": content.content_id,
            "title": content.title,
            "score": self._score(suggestions),
            "suggestions": [suggestion.as_dict() for suggestion in suggestions],
        }

    def _title_suggestions(self, title: str) -> Iterable[Suggestion]:
        length = len(title)
        if length < self.config.min_title_length:
            yield Suggestion(
                severity="warning",
                field="title",
                message="Title is short for search and social previews.",
                action=f"Expand the title to at least {self.config.min_title_length} characters.",
            )
        if length > self.config.max_title_length:
            yield Suggestion(
                severity="warning",
                field="title",
                message="Title may be truncated in search results.",
                action=f"Reduce the title to {self.config.max_title_length} characters or fewer.",
            )
        if title.isupper():
            yield Suggestion(
                severity="info",
                field="title",
                message="Title appears to be all caps.",
                action="Use sentence or title case for a more editorial tone.",
            )

    def _body_suggestions(self, body: str) -> Iterable[Suggestion]:
        words = _words(body)
        if len(words) < self.config.min_body_words:
            yield Suggestion(
                severity="critical",
                field="body",
                message="Body content is thin.",
                action=f"Add supporting detail until the body has at least {self.config.min_body_words} words.",
            )

        long_sentences = [
            sentence for sentence in _sentences(body)
            if len(_words(sentence)) > self.config.max_sentence_words
        ]
        if long_sentences:
            yield Suggestion(
                severity="warning",
                field="body",
                message="Some sentences are difficult to scan.",
                action=f"Split sentences longer than {self.config.max_sentence_words} words.",
            )

        if not re.search(r"\n\s*\n|^\s*#{1,6}\s+", body, re.MULTILINE):
            yield Suggestion(
                severity="info",
                field="body",
                message="Body has no visible section breaks.",
                action="Add headings or paragraph breaks to improve readability.",
            )

    def _summary_suggestions(self, summary: str) -> Iterable[Suggestion]:
        if not summary:
            yield Suggestion(
                severity="warning",
                field="summary",
                message="Summary is missing.",
                action="Add a concise summary for listings, previews, and SEO descriptions.",
            )
            return

        length = len(summary)
        if length < self.config.min_summary_length:
            yield Suggestion(
                severity="info",
                field="summary",
                message="Summary is very short.",
                action=f"Expand the summary to at least {self.config.min_summary_length} characters.",
            )
        if length > self.config.max_summary_length:
            yield Suggestion(
                severity="warning",
                field="summary",
                message="Summary may be too long for previews.",
                action=f"Trim the summary to {self.config.max_summary_length} characters or fewer.",
            )

    def _metadata_suggestions(self, content: CMSContent) -> Iterable[Suggestion]:
        keywords = content.metadata.get("keywords", [])
        if isinstance(keywords, str):
            keywords = [keywords]
        if not isinstance(keywords, list):
            yield Suggestion(
                severity="warning",
                field="metadata.keywords",
                message="Keywords metadata is not a list.",
                action="Store keywords as a list of strings.",
            )
            return

        normalized_keywords = [
            keyword.strip().lower()
            for keyword in keywords
            if isinstance(keyword, str) and keyword.strip()
        ]
        if not normalized_keywords:
            yield Suggestion(
                severity="info",
                field="metadata.keywords",
                message="No keywords were provided.",
                action="Add target keywords to guide search optimization.",
            )
            return

        body = content.body.lower()
        missing = [
            keyword
            for keyword in normalized_keywords
            if body.count(keyword) < self.config.min_keyword_mentions
        ]
        if missing:
            yield Suggestion(
                severity="info",
                field="metadata.keywords",
                message="Some target keywords do not appear in the body.",
                action=f"Review keyword usage for: {', '.join(missing)}.",
            )

    @staticmethod
    def _sort_key(suggestion: Suggestion) -> tuple[int, str]:
        severity_rank = {"critical": 0, "warning": 1, "info": 2}
        return severity_rank[suggestion.severity], suggestion.field

    @staticmethod
    def _score(suggestions: Iterable[Suggestion]) -> int:
        penalties = {"critical": 30, "warning": 15, "info": 5}
        score = 100
        for suggestion in suggestions:
            score -= penalties[suggestion.severity]
        return max(score, 0)


def _words(value: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9']+", value)


def _sentences(value: str) -> list[str]:
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", value)
        if sentence.strip()
    ]
