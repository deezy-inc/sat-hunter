const { env } = require('../env');

describe('env', () => {
    describe('get', () => {
        test('should throw exception when variable is not set', () => {
            // Given
            const inexistentVariable = 'I-AM-NOT-EXISTING'

            // Then
            expect(() => {
                env[inexistentVariable];
            }).toThrow(new Error(`${inexistentVariable} must be set`))
        });

        test('should return value when variable is set', () => {
            // Given
            const existentVariable = 'I-AM-NOT-EXISTING'
            const existentVariableValue = 'I-AM-VALUE'
            env[existentVariable] = existentVariableValue

            // Then
            expect(env[existentVariable]).toBe(existentVariableValue);
        });
    });

    describe('get with fallback', () => {
        test('should return fallback when variable is not set and fallback provided', () => {
            // Given
            const fallback = 'FALLBACK-VALUE'

            // Then
            expect(env.withFallback('SOMETHING', fallback)).toBe(fallback);
        });

        test('should return value when variable is set and fallback provided', () => {
            // Given
            const existentVariable = 'I-AM-EXISTING'
            const existentVariableValue = 'I-AM-EXISTING-VALUE'
            const fallback = 'FALLBACK-VALUE'

            // When
            env[existentVariable] = existentVariableValue;

            // Then
            expect(env.withFallback(existentVariable, fallback)).toBe(existentVariableValue);
        });
    });
});