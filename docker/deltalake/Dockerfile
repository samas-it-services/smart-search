FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    openjdk-11-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set Java environment
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

# Install Python packages for Delta Lake
RUN pip install --no-cache-dir \
    delta-spark==2.4.0 \
    pyspark==3.4.1 \
    pandas==2.0.3 \
    pyarrow==12.0.1 \
    redis==4.6.0 \
    fastapi==0.103.0 \
    uvicorn==0.23.0 \
    requests==2.31.0

# Create working directory
WORKDIR /app

# Copy application files
COPY processor.py /app/
COPY requirements.txt /app/
COPY scripts/ /app/scripts/

# Create data directories
RUN mkdir -p /data/delta /source_data

# Expose port for API
EXPOSE 8081

# Start the Delta Lake processor
CMD ["python", "processor.py"]