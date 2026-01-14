# Python Scripts

Python backend code and scripts for Agent Spark.

## Overview

This directory contains the Python backend application and related utilities.

## Structure

```
python/
├── app/           # Main Python backend application
│   ├── api/       # API endpoints
│   ├── db/        # Database models and migrations
│   ├── engine/    # Processing engines
│   ├── models/    # Data models
│   └── utils/     # Utility functions
├── tests/         # Python tests
│   ├── backend/   # Backend unit tests
│   └── concurrency/ # Concurrency tests
├── requirements.txt   # Python dependencies
└── pytest.ini         # Pytest configuration
```

## Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run backend server
python -m app.cli runserver --host 0.0.0.0 --port 8000

# Run tests
pytest
```

## Configuration

The backend uses environment variables for configuration. Copy `env.example` to `.env` and configure as needed.
