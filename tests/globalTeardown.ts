import { execSync } from 'child_process'

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...')
  
  try {
    // Stop test containers
    console.log('🐳 Stopping test containers...')
    // execSync('docker-compose -f docker-compose.test.yml down', { stdio: 'inherit' })
    
    console.log('✅ Global test teardown completed')
  } catch (error) {
    console.error('❌ Global test teardown failed:', error)
  }
}