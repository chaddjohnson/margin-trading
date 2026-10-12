"""Pre-evaluation configuration registry (methodological safeguard: record every candidate BEFORE its
profitability is seen; the runner refuses unregistered configs). One JSONL per family directory."""
import json
import time
from pathlib import Path


def register(family_dir, entries):
    """Append entries (dicts with at least name, family, description, params, hypothesis) with a
    timestamp. Re-registering an existing name is refused (append-only; failures stay on record)."""
    path = Path(family_dir) / 'registry.jsonl'
    existing = registered_names(family_dir)
    with open(path, 'a') as f:
        for ent in entries:
            if not {'name', 'family', 'description', 'params', 'hypothesis'} <= set(ent):
                raise ValueError(f'registry entry missing required keys: {ent.get("name", ent)}')
            if ent['name'] in existing:
                raise ValueError(f"'{ent['name']}' is already registered; registry is append-only")
            f.write(json.dumps(dict(ent, registered_at=time.strftime('%Y-%m-%dT%H:%M:%S'))) + '\n')
            existing.add(ent['name'])
    return path


def registered_names(family_dir):
    path = Path(family_dir) / 'registry.jsonl'
    if not path.exists():
        return set()
    return {json.loads(line)['name'] for line in path.read_text().splitlines() if line.strip()}


def load(family_dir):
    path = Path(family_dir) / 'registry.jsonl'
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
