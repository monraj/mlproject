import os

# Tests run without the access code a local .env may set for the online server.
os.environ["APP_ACCESS_CODE"] = ""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.vision.fake import DemoProvider
from app.vision.provider import FallbackProvider, set_provider


@pytest.fixture(autouse=True)
def demo_provider():
    set_provider(FallbackProvider([DemoProvider()]))
    yield
    set_provider(None)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
