import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Global test setup
beforeAll(async () => {
  // Initialize test database
  console.log('Setting up test environment...')
})

afterAll(async () => {
  // Cleanup after all tests
  console.log('Tearing down test environment...')
})

// Increase timeout for integration tests
jest.setTimeout(30000)

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}