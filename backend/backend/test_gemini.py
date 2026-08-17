import os
import time
from dotenv import load_dotenv
from google import genai

load_dotenv()

model = os.getenv("GEMINI_MODEL")

print("Model:", model)
print()

for i in range(1, 4):
    key = os.getenv(f"GEMINI_API_KEY_{i}")

    if not key:
        print(f"KEY {i}: NOT CONFIGURED")
        continue

    print(f"Testing KEY {i}...")
    start = time.time()

    try:
        client = genai.Client(api_key=key)

        response = client.models.generate_content(
            model=model,
            contents="Reply with exactly: GEMINI_TEST_OK",
        )

        elapsed = time.time() - start

        print(f"KEY {i}: SUCCESS")
        print(f"Time: {elapsed:.2f} seconds")
        print(f"Response: {response.text}")
        print()

    except Exception as e:
        elapsed = time.time() - start

        print(f"KEY {i}: FAILED")
        print(f"Time: {elapsed:.2f} seconds")
        print(f"Error: {type(e).__name__}: {e}")
        print()