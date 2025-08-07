#!/usr/bin/env python3
"""
Delta Lake Data Processor for Smart Search
Converts JSON data to Delta Lake format and provides search API
"""

import json
import os
import sys
import time
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

import pandas as pd
import redis
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
import uvicorn
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, regexp_extract, when
from delta import *

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeltaLakeProcessor:
    def __init__(self):
        self.spark = None
        self.redis_client = None
        self.delta_path = os.getenv('DELTA_PATH', '/data/delta')
        self.source_data_path = '/source_data'
        self.redis_url = os.getenv('REDIS_URL', 'redis://redis:6379')
        self.initialize()

    def initialize(self):
        """Initialize Spark session and Redis connection"""
        try:
            # Initialize Spark with Delta Lake
            builder = SparkSession.builder \
                .appName("SmartSearchDeltaProcessor") \
                .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
                .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
                .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
                .config("spark.sql.adaptive.enabled", "true") \
                .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
            
            self.spark = configure_spark_with_delta_pip(builder).getOrCreate()
            logger.info("✅ Spark session with Delta Lake initialized")

            # Initialize Redis
            self.redis_client = redis.from_url(self.redis_url)
            self.redis_client.ping()
            logger.info("✅ Redis connection established")

            # Create delta directories
            os.makedirs(self.delta_path, exist_ok=True)
            logger.info(f"📁 Delta path ready: {self.delta_path}")

        except Exception as e:
            logger.error(f"❌ Initialization failed: {e}")
            sys.exit(1)

    def convert_json_to_delta(self, industry: str, size: str):
        """Convert JSON data files to Delta Lake tables"""
        try:
            source_dir = f"{self.source_data_path}/{industry}/{size}"
            if not os.path.exists(source_dir):
                logger.warning(f"⚠️ Source directory not found: {source_dir}")
                return

            logger.info(f"🔄 Converting {industry} {size} data to Delta Lake...")

            for filename in os.listdir(source_dir):
                if not filename.endswith('.json'):
                    continue

                file_path = os.path.join(source_dir, filename)
                table_name = f"{industry}_{filename.replace('.json', '')}"
                delta_table_path = os.path.join(self.delta_path, table_name)

                logger.info(f"📊 Processing {filename} -> {table_name}")

                # Read JSON data
                with open(file_path, 'r') as f:
                    data = json.load(f)

                if not data:
                    logger.warning(f"⚠️ Empty data in {filename}")
                    continue

                # Convert to Spark DataFrame
                df = self.spark.read.json(self.spark.sparkContext.parallelize([json.dumps(record) for record in data]))
                
                # Add metadata columns
                df = df.withColumn("_created_at", lit(datetime.now().isoformat()))
                df = df.withColumn("_source_file", lit(filename))
                df = df.withColumn("_industry", lit(industry))
                df = df.withColumn("_size", lit(size))

                # Write as Delta table
                df.write.format("delta").mode("overwrite").save(delta_table_path)
                
                # Create table in Spark catalog
                self.spark.sql(f"CREATE TABLE IF NOT EXISTS {table_name} USING DELTA LOCATION '{delta_table_path}'")
                
                record_count = df.count()
                logger.info(f"✅ Created Delta table {table_name} with {record_count} records")

                # Cache table statistics in Redis
                stats = {
                    "table_name": table_name,
                    "record_count": record_count,
                    "file_size": os.path.getsize(file_path),
                    "created_at": datetime.now().isoformat(),
                    "industry": industry,
                    "size": size
                }
                self.redis_client.setex(f"delta:stats:{table_name}", 3600, json.dumps(stats))

        except Exception as e:
            logger.error(f"❌ Failed to convert JSON to Delta: {e}")
            raise

    def search_delta_tables(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search across all Delta tables"""
        try:
            logger.info(f"🔍 Searching Delta tables for: {query}")
            
            # Get all available tables
            tables = self.spark.sql("SHOW TABLES").collect()
            results = []

            for table_row in tables:
                table_name = table_row['tableName']
                
                try:
                    # Generate search SQL based on table structure
                    table_df = self.spark.table(table_name)
                    columns = table_df.columns
                    
                    # Build search conditions for text columns
                    search_conditions = []
                    text_columns = [col for col in columns if col in ['name', 'title', 'description', 'symbol', 'company_name', 'generic_name', 'brand_name']]
                    
                    for col_name in text_columns:
                        search_conditions.append(f"LOWER({col_name}) LIKE '%{query.lower()}%'")
                    
                    if not search_conditions:
                        continue
                    
                    # Execute search query
                    search_sql = f"""
                        SELECT *, '{table_name}' as _table_name
                        FROM {table_name} 
                        WHERE {' OR '.join(search_conditions)}
                        LIMIT {limit}
                    """
                    
                    table_results = self.spark.sql(search_sql).collect()
                    
                    # Convert to JSON-serializable format
                    for row in table_results:
                        result = {
                            "id": str(row.get('id', f"{table_name}_{len(results)}")),
                            "title": str(row.get('title') or row.get('name') or row.get('symbol', 'Unknown')),
                            "description": str(row.get('description', f"Data from {table_name}")),
                            "type": row.get('type', table_name.split('_')[0]),
                            "table": table_name,
                            "score": 1.0,  # Could implement more sophisticated scoring
                            "metadata": {k: str(v) for k, v in row.asDict().items() if v is not None}
                        }
                        results.append(result)
                
                except Exception as table_error:
                    logger.warning(f"⚠️ Error searching table {table_name}: {table_error}")
                    continue

            # Sort by relevance (basic implementation)
            results.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            # Cache results in Redis
            cache_key = f"search:{query.lower()}:{limit}"
            self.redis_client.setex(cache_key, 300, json.dumps(results[:limit]))
            
            logger.info(f"✅ Found {len(results)} results across Delta tables")
            return results[:limit]

        except Exception as e:
            logger.error(f"❌ Delta table search failed: {e}")
            raise

    def get_table_stats(self, table_name: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics for Delta tables"""
        try:
            if table_name:
                # Get stats for specific table
                cached_stats = self.redis_client.get(f"delta:stats:{table_name}")
                if cached_stats:
                    return json.loads(cached_stats)
                
                # Generate stats if not cached
                df = self.spark.table(table_name)
                count = df.count()
                
                stats = {
                    "table_name": table_name,
                    "record_count": count,
                    "created_at": datetime.now().isoformat()
                }
                self.redis_client.setex(f"delta:stats:{table_name}", 3600, json.dumps(stats))
                return stats
            else:
                # Get stats for all tables
                tables = self.spark.sql("SHOW TABLES").collect()
                all_stats = []
                
                for table_row in tables:
                    table_name = table_row['tableName']
                    stats = self.get_table_stats(table_name)
                    all_stats.append(stats)
                
                return {"tables": all_stats, "total_tables": len(all_stats)}

        except Exception as e:
            logger.error(f"❌ Failed to get table stats: {e}")
            raise

# Initialize processor
processor = DeltaLakeProcessor()

# FastAPI app
app = FastAPI(title="Smart Search Delta Lake Processor", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    """Process data on startup"""
    try:
        # Convert sample data to Delta Lake
        industries = ['healthcare', 'finance', 'retail', 'education']
        sizes = ['tiny', 'small', 'medium']
        
        for industry in industries:
            for size in sizes:
                try:
                    processor.convert_json_to_delta(industry, size)
                except Exception as e:
                    logger.warning(f"⚠️ Failed to process {industry} {size}: {e}")
                    
        logger.info("🚀 Delta Lake processor startup completed")
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        processor.redis_client.ping()
        tables = processor.spark.sql("SHOW TABLES").count()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "delta_path": processor.delta_path,
            "available_tables": tables
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e)}
        )

@app.get("/search")
async def search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, description="Maximum results to return")
):
    """Search Delta Lake tables"""
    try:
        # Check cache first
        cache_key = f"search:{q.lower()}:{limit}"
        cached_results = processor.redis_client.get(cache_key)
        
        if cached_results:
            logger.info(f"📊 Returning cached results for: {q}")
            return json.loads(cached_results)
        
        # Perform search
        results = processor.search_delta_tables(q, limit)
        return results
    
    except Exception as e:
        logger.error(f"❌ Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tables")
async def get_tables():
    """Get all available Delta tables"""
    try:
        return processor.get_table_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tables/{table_name}")
async def get_table_info(table_name: str):
    """Get information about a specific table"""
    try:
        return processor.get_table_stats(table_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")

@app.post("/convert/{industry}/{size}")
async def convert_data(industry: str, size: str):
    """Convert JSON data to Delta Lake format"""
    try:
        processor.convert_json_to_delta(industry, size)
        return {"message": f"Successfully converted {industry} {size} data to Delta Lake"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Wait for dependencies
    time.sleep(30)
    
    # Start the API server
    uvicorn.run(
        "processor:app",
        host="0.0.0.0",
        port=8081,
        log_level="info",
        reload=False
    )