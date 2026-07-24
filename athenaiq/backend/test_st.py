from sentence_transformers import SentenceTransformer
import traceback

try:
    print("Trying without device param...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Success!")
except Exception as e:
    traceback.print_exc()

try:
    print("\nTrying with device='cpu'...")
    model2 = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    print("Success!")
except Exception as e:
    traceback.print_exc()
