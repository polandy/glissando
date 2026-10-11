# Persistent storage

The app asks the browser not to evict its storage (`navigator.storage.persist()`). The answer is
_granted_, _refused_ or _unsupported_; a refusal is not an error — the app keeps working.
