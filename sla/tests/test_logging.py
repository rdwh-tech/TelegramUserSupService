import json
import logging

from log_format import JsonFormatter


def test_log_record_is_valid_json() -> None:
    record = logging.LogRecord(
        "uvicorn", logging.INFO, __file__, 1, 'hello "%s"\n', ("sla",), None
    )

    assert json.loads(JsonFormatter().format(record)) == {
        "level": "INFO",
        "logger": "uvicorn",
        "message": 'hello "sla"\n',
    }
