# 🔧 Immediate Fix for Duplicate Key Error

## ⚡ Quick Solution

If you're seeing this error right now:
```
ERROR: duplicate key value violates unique constraint "healthcare_data_pkey"
```

**Run this command to fix it immediately:**

```bash
# Clear existing data and restart
./scripts/clear-data.sh postgres
DATA_SIZE=medium ./run-postgres-redis-showcase.sh
```

Or if you want to use existing data without reseeding:
```bash
# Skip seeding and use existing data (much faster)
SKIP_IF_EXISTS=true DATA_SIZE=medium ./run-postgres-redis-showcase.sh
```

## 🔧 What Was Fixed

**Problem**: The duplicate check was happening too late in the process, after CSV conversion started.

**Solution**: Moved the duplicate data check to the very beginning of the seeding process.

### Before (Broken):
```bash
1. Process JSON file
2. Convert to CSV  
3. Copy to container
4. Check for duplicates ← TOO LATE!
5. Try to insert (fails with duplicate key error)
```

### After (Fixed):
```bash
1. Check for duplicates FIRST ← MOVED HERE!
2. Clear existing data if needed
3. Process JSON file
4. Convert to CSV
5. Copy to container
6. Insert successfully
```

## 🚀 This Update Ensures

- ✅ **No more duplicate key errors** - Existing data is cleared before processing
- ✅ **Faster development** - Use `SKIP_IF_EXISTS=true` to skip seeding
- ✅ **Clean data** - Fresh data every time unless skipped
- ✅ **Better error handling** - Clear messages about what's happening

## 🎯 Choose Your Approach

```bash
# Option 1: Fresh data every time (default)
DATA_SIZE=medium ./run-postgres-redis-showcase.sh

# Option 2: Skip if data exists (faster for development)
SKIP_IF_EXISTS=true DATA_SIZE=medium ./run-postgres-redis-showcase.sh

# Option 3: Manual control
./scripts/clear-data.sh postgres    # Clear first
DATA_SIZE=medium ./run-postgres-redis-showcase.sh
```

**The showcase will now work without duplicate key errors!** ✅