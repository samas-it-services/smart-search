import hashlib


def redact_full(value):
    return None


def redact_part(value, keep=4):
    if not value:
        return value
    s = str(value)
    return ('*' * max(0, len(s) - keep)) + s[-keep:]


def hash_value(value):
    if value is None:
        return None
    return hashlib.sha256(str(value).encode()).hexdigest()[:16]


_TOKENS = {}


def tokenize(value):
    if value in _TOKENS:
        return _TOKENS[value]
    token = 'tok_' + hashlib.sha1(str(value).encode()).hexdigest()[:10]
    _TOKENS[value] = token
    return token


def initials(value):
    if not value:
        return value
    parts = str(value).split()
    return ''.join(p[0].upper() for p in parts)


def year_only(value):
    if not value:
        return value
    return str(value)[:4]


def yyyy_mm(value):
    if not value:
        return value
    return str(value)[:7]


def city_only(value):
    if not value:
        return value
    # naive split on comma
    return str(value).split(',')[-1].strip() if ',' in str(value) else value

