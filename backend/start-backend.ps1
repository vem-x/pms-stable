$env:ENVIRONMENT='production'
$env:DATABASE_URL='postgresql://pms_user:pms_password@172.28.0.1:5432/pms_db'
$env:JWT_SECRET_KEY='your-super-secret-jwt-key-change-in-production'
$env:CORS_ALLOWED_ORIGINS='http://localhost:3000,https://localhost:3000,http://localhost:3002,https://localhost:3002,http://160.226.0.67:3000,http://160.226.0.67:3002'

uvicorn main:app --host 0.0.0.0 --port 8000