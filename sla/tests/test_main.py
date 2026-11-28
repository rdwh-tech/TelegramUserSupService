import pytest
from fastapi.testclient import TestClient

from main import Settings, create_app


@pytest.mark.parametrize("path", ["/health", "/ready"])
def test_service_probes(path: str) -> None:
    with TestClient(create_app()) as client:
        response = client.get(path)

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_reads_settings_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SLA_HOST", "127.0.0.1")
    monkeypatch.setenv("SLA_PORT", "8081")

    settings = Settings()

    assert settings.host == "127.0.0.1"
    assert settings.port == 8081
