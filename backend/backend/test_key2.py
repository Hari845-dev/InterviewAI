import time

from app.config.settings import get_settings
from google import genai

settings = get_settings()

key = settings.gemini_api_key_2

if not key:
    print("GEMINI_API_KEY_2 not configured")
    raise SystemExit(1)

client = genai.Client(api_key=key)

print("Model:", settings.gemini_model)

for i in range(3):
    print(f"\nTest {i + 1}")

    start = time.perf_counter()

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents="Reply with exactly: GEMINI_TEST_OK",
        )

        elapsed = time.perf_counter() - start

        print("SUCCESS")
        print(f"Time: {elapsed:.2f}s")
        print("Response:", response.text)

    except Exception as exc:
        elapsed = time.perf_counter() - start

        print("FAILED")
        print(f"Time: {elapsed:.2f}s")
        print("Error:", exc)