import json
import sys
from typing import Any


def main() -> int:
    payload = json.load(sys.stdin)
    source = payload["source"]
    snapshot = payload["snapshot"]

    namespace: dict[str, Any] = {}
    exec(source, namespace)

    handler = namespace.get("on_turn") or namespace.get("onTurn")
    if handler is None:
        raise RuntimeError("Python bot source must define on_turn(snapshot) or onTurn(snapshot)")

    action = handler(snapshot)
    json.dump(action, sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
