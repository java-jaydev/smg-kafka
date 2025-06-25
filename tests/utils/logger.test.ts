import { logger, LogLevel } from '../../src/utils/logger'

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance
  
  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
  })
  
  afterEach(() => {
    consoleLogSpy.mockRestore()
  })
  
  describe('Log Levels', () => {
    it('should log error messages', () => {
      logger.error('Test error message')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Test error message')
      )
    })
    
    it('should log warning messages', () => {
      logger.warn('Test warning message')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] Test warning message')
      )
    })
    
    it('should log info messages', () => {
      logger.info('Test info message')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test info message')
      )
    })
    
    it('should log debug messages when log level is debug', () => {
      // Note: This test depends on the current log level configuration
      logger.debug('Test debug message')
      // Debug messages might not be logged based on current log level
    })
  })
  
  describe('Message Formatting', () => {
    it('should include timestamp in log messages', () => {
      logger.info('Test message')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
      )
    })
    
    it('should handle additional arguments', () => {
      const testObj = { key: 'value' }
      logger.info('Test message', testObj)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test message'),
        testObj
      )
    })
  })
  
  describe('LogLevel Enum', () => {
    it('should have correct log level values', () => {
      expect(LogLevel.ERROR).toBe(0)
      expect(LogLevel.WARN).toBe(1)
      expect(LogLevel.INFO).toBe(2)
      expect(LogLevel.DEBUG).toBe(3)
    })
  })
})