const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 Setting up ArtisanAI Marketplace...\n');

// Check if Node.js is installed
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js ${nodeVersion} is installed`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js first.');
  process.exit(1);
}

// Check if npm is installed
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm ${npmVersion} is installed`);
} catch (error) {
  console.error('❌ npm is not installed. Please install npm first.');
  process.exit(1);
}

console.log('\n📦 Installing dependencies...\n');

try {
  // Install root dependencies
  console.log('Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Install backend dependencies
  console.log('\nInstalling backend dependencies...');
  execSync('npm install', { cwd: 'backend', stdio: 'inherit' });

  // Install frontend dependencies
  console.log('\nInstalling frontend dependencies...');
  execSync('npm install', { cwd: 'frontend', stdio: 'inherit' });

  console.log('\n✅ All dependencies installed successfully!');

  // Create .env file if it doesn't exist
  const envPath = path.join(__dirname, 'backend', '.env');
  const envExamplePath = path.join(__dirname, 'backend', '.env.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('\n✅ Created .env file from template');
    console.log('📝 Please update backend/.env with your MongoDB URI and API keys');
  }

  console.log('\n🚀 Setup complete! To start the application:');
  console.log('\n1. Start MongoDB (if using local installation):');
  console.log('   mongod');
  console.log('\n2. Seed sample data (optional):');
  console.log('   cd backend && node seedData.js');
  console.log('\n3. Start the application:');
  console.log('   npm run dev');
  console.log('\n4. Open your browser to:');
  console.log('   Frontend: http://localhost:3000');
  console.log('   Backend API: http://localhost:5000');
  console.log('\n🎯 Demo credentials:');
  console.log('   Email: demo@artisan.com');
  console.log('   Password: demo123');
  console.log('\n🎉 Happy coding! Built with ❤️ for Indian Artisans');

} catch (error) {
  console.error('\n❌ Installation failed:', error.message);
  console.log('\n💡 Try running these commands manually:');
  console.log('   npm install');
  console.log('   cd backend && npm install');
  console.log('   cd ../frontend && npm install');
  process.exit(1);
}
