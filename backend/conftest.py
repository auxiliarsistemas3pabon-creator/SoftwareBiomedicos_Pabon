import pytest


@pytest.fixture(autouse=True)
def _inmemory_channel_layer(settings):
    """Los tests no deben depender de un Redis real para el channel layer."""
    settings.CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }
