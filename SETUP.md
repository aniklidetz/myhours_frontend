# MyHours App Setup Guide

## Development Environment Setup

### 1. Backend Server

#### Option A: Using Docker (Recommended)
If you have Docker installed, you can run the backend using Docker Compose:
```bash
cd backend
docker-compose up -d
```

The backend will be available at:
- API: http://localhost:8000
- Admin panel: http://localhost:8000/admin

#### Option B: Manual Setup
If you prefer to run Django manually:
```bash
cd backend
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (for admin access)
python manage.py createsuperuser

# Run server
python manage.py runserver 0.0.0.0:8000
```

### 2. Configure API URL

#### For iOS Development
- **iOS Simulator**: Uses `http://192.168.1.164:8000` by default (IP address for better compatibility)
- **iOS Physical Device**: 
  1. Find your computer's IP address: `ipconfig getifaddr en0` (Mac)
  2. Update `.env` file with your IP address
  3. Set `EXPO_PUBLIC_API_URL=http://YOUR_IP:8000`
  
**Note**: iOS Simulator sometimes has issues with `localhost`, so we use IP address by default.

#### For Android Development
- **Android Emulator**: Uses `http://10.0.2.2:8000` (in code, but environment variable takes precedence)
- **Android Physical Device**: Uses IP address from environment variable
  1. Find your computer's IP address: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
  2. Update `.env` file with your IP address
  3. Set `EXPO_PUBLIC_API_URL=http://YOUR_IP:8000`

### 3. Common Issues

#### iOS Authentication Error (401)
- Verify your backend server is running
- Check that the user credentials are correct
- Ensure the Django backend has the user account created
- If using mock tokens, clear authentication data using the "Clear Auth Data" button in development mode

#### Android Network Error
- Make sure your backend accepts connections from all hosts:
  - In Django settings.py: `ALLOWED_HOSTS = ['*']` (for development only)
- Check firewall settings allow connections on port 8000
- For physical devices, ensure both device and computer are on the same network

#### Clear Cache and Reset
If you encounter persistent issues:
```bash
# Clear Metro bundler cache
npx expo start -c

# Clear all caches and reinstall
rm -rf node_modules
rm package-lock.json
npm install --legacy-peer-deps
npx expo start -c
```

### 4. Running the App

```bash
# Start the development server
npx expo start

# Run on iOS
i

# Run on Android
a
```

### 5. Emulator Limitations

#### iOS Simulator
- Camera: Works with simulated camera
- Location: Can simulate location
- Biometric: Limited functionality (mock data)

#### Android Emulator
- Camera: May not work properly
- Location: Limited GPS simulation
- Biometric: Use physical device for full testing

**Recommendation**: Use physical devices for biometric testing and production features.

### 6. Development Features

#### Mock Data
- Set `ENABLE_MOCK_DATA: true` in `src/config.js` for offline development
- Emulator automatically provides fallback location data
- Biometric operations can be mocked for testing

#### Debugging
- Office location spam logs have been reduced
- Network errors are handled gracefully
- Camera permissions are properly managed

### 7. Testing Credentials
Create test users in Django admin panel:
1. Access Django admin: http://localhost:8000/admin
2. Create users with appropriate roles (admin, accountant, employee)
3. Use those credentials to login in the mobile app

### 8. Docker Configuration (Optional)

If you're using Docker for the backend, here are additional tips:

#### Docker Network Configuration
For mobile device testing with Docker:
```bash
# Ensure Django is listening on all interfaces (should be default in docker-compose)
docker-compose logs web | grep "Starting development server"
# Should show: Starting development server at http://0.0.0.0:8000/
```

**Important for Physical Devices:**
- Physical devices cannot access `localhost` - they need your computer's IP address
- Make sure both devices are on the same WiFi network
- Update the `.env` file with your actual IP address (not localhost)
- Docker must be configured to accept connections from all interfaces (0.0.0.0:8000)

#### Environment Variables for Docker
Create a `.env` file in the backend directory:
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgres://user:pass@db:5432/myhours
ALLOWED_HOSTS=*
```

#### Common Docker Commands
```bash
# View logs
docker-compose logs -f backend

# Run Django migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Stop all containers
docker-compose down

# Rebuild containers (after requirements.txt changes)
docker-compose build
docker-compose up -d
```