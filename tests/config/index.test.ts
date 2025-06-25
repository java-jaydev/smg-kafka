import config from '../../src/config'

describe('Configuration', () => {
  describe('App Configuration', () => {
    it('should have default port', () => {
      expect(config.app.port).toBeDefined()
      expect(typeof config.app.port).toBe('number')
    })
    
    it('should have environment setting', () => {
      expect(config.app.env).toBeDefined()
      expect(['development', 'production', 'test'].includes(config.app.env)).toBe(true)
    })
    
    it('should have log level setting', () => {
      expect(config.app.logLevel).toBeDefined()
      expect(['error', 'warn', 'info', 'debug'].includes(config.app.logLevel)).toBe(true)
    })
  })
  
  describe('Database Configuration', () => {
    it('should have database URL', () => {
      expect(config.database.url).toBeDefined()
      expect(typeof config.database.url).toBe('string')
      expect(config.database.url).toMatch(/^postgresql:\/\//)
    })
  })
  
  describe('Kafka Configuration', () => {
    it('should have brokers configuration', () => {
      expect(config.kafka.brokers).toBeDefined()
      expect(Array.isArray(config.kafka.brokers)).toBe(true)
      expect(config.kafka.brokers.length).toBeGreaterThan(0)
    })
    
    it('should have client ID', () => {
      expect(config.kafka.clientId).toBeDefined()
      expect(typeof config.kafka.clientId).toBe('string')
    })
    
    it('should have group ID', () => {
      expect(config.kafka.groupId).toBeDefined()
      expect(typeof config.kafka.groupId).toBe('string')
    })
  })
  
  describe('Environment Variables', () => {
    it('should handle missing environment variables with defaults', () => {
      // Test that config object is complete even without all env vars
      expect(config.app.port).toBeGreaterThan(0)
      expect(config.kafka.brokers[0]).toContain(':')
    })
  })
})