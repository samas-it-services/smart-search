#!/usr/bin/env python3
"""
Convert JSON data to Parquet format for Delta Lake
"""

import json
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import os
import sys
from pathlib import Path

def convert_json_to_parquet(json_file_path, output_dir, table_name):
    """Convert JSON file to Parquet format"""
    
    print(f"Converting {json_file_path} to Parquet format...")
    
    # Read JSON data
    with open(json_file_path, 'r') as f:
        data = json.load(f)
    
    if not data:
        print(f"No data found in {json_file_path}")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Add metadata columns
    df['_created_at'] = pd.Timestamp.now()
    df['_source_file'] = os.path.basename(json_file_path)
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Write as Parquet
    parquet_file = os.path.join(output_dir, f"{table_name}.parquet")
    df.to_parquet(parquet_file, index=False, compression='snappy')
    
    print(f"Converted {len(df)} records to {parquet_file}")
    return parquet_file

def main():
    """Main conversion function"""
    if len(sys.argv) < 4:
        print("Usage: python convert_to_parquet.py <json_file> <output_dir> <table_name>")
        sys.exit(1)
    
    json_file = sys.argv[1]
    output_dir = sys.argv[2]
    table_name = sys.argv[3]
    
    if not os.path.exists(json_file):
        print(f"JSON file not found: {json_file}")
        sys.exit(1)
    
    convert_json_to_parquet(json_file, output_dir, table_name)

if __name__ == "__main__":
    main()