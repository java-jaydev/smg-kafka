import { execSync } from 'child_process'
import * as dotenv from 'dotenv'

// Load test environment
dotenv.config({ path: '.env.test' })

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...')
  
  try {
    // Check if Docker is available
    execSync('docker --version', { stdio: 'ignore' })
    
    // Start test containers if needed
    console.log('🐳 Starting test containers...')
    // execSync('docker-compose -f docker-compose.test.yml up -d', { stdio: 'inherit' })
    
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('✅ Global test setup completed')
  } catch (error) {
    console.error('❌ Global test setup failed:', error)
    process.exit(1)
  }
}