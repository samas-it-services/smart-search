# Changelog

All notable changes to this project will be documented in this file.

---

## [Date: 2025-12-21]

### Title
SupabaseProvider Bug Fixes - Enable ilm-red Integration

### Summary of Changes
Fixed critical bugs in SupabaseProvider that prevented the package from building with TypeScript strict mode. These fixes enable the package to be used as a dependency in ilm-red and other projects.

### Files Added
| File | Reason |
|------|--------|
| `dist/index.js` | Built CommonJS output for npm consumers |
| `dist/index.mjs` | Built ESM output for modern bundlers |
| `dist/index.d.ts` | TypeScript declarations for type safety |
| `dist/index.d.mts` | ESM TypeScript declarations |
| `docs/CHANGELOG.md` | This changelog file to track all changes |

### Files Changed
| File | What Changed |
|------|--------------|
| `src/providers/SupabaseProvider.ts` | Fixed `this.supabase` to `this.client` at lines 141 and 285. The property was named `client` but code was referencing non-existent `supabase` property |
| `src/providers/SupabaseProvider.ts` | Added undefined checks for `searchConfig` at lines 100-102, 107, 282, 310. Prevents runtime errors when searchConfig is not provided |
| `src/providers/SupabaseProvider.ts` | Changed property type from `searchConfig?: SupabaseSearchConfig` to `searchConfig: SupabaseSearchConfig \| undefined` to fix `exactOptionalPropertyTypes` TypeScript error |

### Rationale
The SupabaseProvider had three categories of bugs:
1. **Wrong property name**: Code referenced `this.supabase` but the property was defined as `this.client`
2. **Missing null checks**: `searchConfig` is optional but code accessed `searchConfig.tables` without checking if it was defined
3. **TypeScript strict mode**: The `exactOptionalPropertyTypes` compiler option rejected the original property type syntax

### How to Test
1. Run `npm run build` - should complete without errors
2. Check `dist/` folder contains: `index.js`, `index.mjs`, `index.d.ts`, `index.d.mts`
3. In a consuming project, import and use SupabaseProvider:
   ```typescript
   import { SupabaseProvider } from '@bilgrami/smart-search';
   const provider = new SupabaseProvider({ url: '...', key: '...' });
   await provider.connect();
   await provider.search('test query');
   ```

### Dependencies
- No new dependencies added

### Breaking Changes
- None. The API remains unchanged, only internal bugs were fixed.
