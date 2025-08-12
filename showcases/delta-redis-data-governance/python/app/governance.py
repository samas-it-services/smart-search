from typing import Any, Dict, Tuple, Callable


def compile_policy(policy: Dict[str, Any], role: str, user_ctx: Dict[str, Any]) -> Tuple[Callable[[Dict[str, Any]], bool], Dict[str, str]]:
    roles = {r['id']: r for r in policy.get('roles', [])}
    rconf = roles.get(role) or {"row_filter": "true", "column_masks": {}}
    row_filter = rconf.get('row_filter', 'true')
    masks = rconf.get('column_masks', {})

    def predicate(row: Dict[str, Any]) -> bool:
        # Very small expression support for demo
        if row_filter in (True, 'true', 'TRUE', '1'):
            return True
        if 'region in ${user.allowed_regions}' in row_filter:
            allowed = user_ctx.get('allowed_regions', [])
            return row.get('region') in allowed
        if 'clinician_id == ${user.id}' in row_filter:
            return row.get('clinician_id') == user_ctx.get('id')
        # Default allow to avoid empty demo
        return True

    return predicate, masks


def apply_masks(row: Dict[str, Any], masks: Dict[str, str]) -> Dict[str, Any]:
    from .utils.masking import (
        redact_full, redact_part, hash_value, tokenize, initials,
        year_only, yyyy_mm, city_only
    )
    out = dict(row)
    for field, mask in masks.items():
        val = out.get(field)
        if mask == 'redact_full':
            out[field] = redact_full(val)
        elif mask == 'redact_part':
            out[field] = redact_part(val, keep=4)
        elif mask == 'hash':
            out[field] = hash_value(val)
        elif mask == 'tokenize':
            out[field] = tokenize(val)
        elif mask == 'initials':
            out[field] = initials(val)
        elif mask in ('year_only',):
            out[field] = year_only(val)
        elif mask in ('yyyy_mm',):
            out[field] = yyyy_mm(val)
        elif mask in ('city_only',):
            out[field] = city_only(val)
        elif mask in ('null', 'none'):
            out[field] = None
    return out

