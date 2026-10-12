FROM python:3.12-slim-bookworm

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install OpenJDK 17 LTS, GCC/G++ build essentials, and Node.js for sandboxed multi-language execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    build-essential \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify compilers
RUN javac -version && java -version && gcc --version && node -v

# Create isolated unprivileged execution user
RUN groupadd -r codeforge && useradd -r -g codeforge -m -d /home/codeforge codeforge

WORKDIR /app

# Copy dependency definition and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app
COPY app ./app

# Set permissions
RUN chown -R codeforge:codeforge /app /home/codeforge

USER codeforge

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
