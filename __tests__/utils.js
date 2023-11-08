const { get_excluded_tags } = require('../utils') // replace with your actual file path

describe('get_excluded_tags', () => {
    test('should return correct format', () => {
        process.env.EXCLUDE_TAGS = 'omega alpha pizza/omega omega/alpha/pizza'
        const result = get_excluded_tags({ fee_rate: 0 })
        expect(result).toEqual([['omega'], ['alpha'], ['pizza', 'omega'], ['omega', 'alpha', 'pizza']])
    })

    test('should trim leading and trailing spaces', () => {
        process.env.EXCLUDE_TAGS = ' omega alpha pizza/omega '
        const result = get_excluded_tags({ fee_rate: 0 })
        expect(result).toEqual([['omega'], ['alpha'], ['pizza', 'omega']])
    })

    test('should return empty array when EXCLUDE_TAGS is empty string', () => {
        process.env.EXCLUDE_TAGS = ''
        const result = get_excluded_tags({ fee_rate: 0 })
        expect(result).toEqual([])
    })

    test('should return null when EXCLUDE_TAGS is not set', () => {
        delete process.env.EXCLUDE_TAGS
        const result = get_excluded_tags({ fee_rate: 0 })
        expect(result).toBeNull()
    })

    test('should use high fee excluded tags when fee_rate is higher than EXCLUDE_TAGS_HIGH_FEE_THRESHOLD', () => {
        process.env.EXCLUDE_TAGS_HIGH_FEE_THRESHOLD = '10'
        process.env.EXCLUDE_TAGS_HIGH_FEE = 'alpha/pizza'
        process.env.EXCLUDE_TAGS = 'omega alpha pizza/omega'
        const result = get_excluded_tags({ fee_rate: 20 })
        expect(result).toEqual([['alpha', 'pizza']])
    })

    test('should not use high fee excluded tags when fee_rate is lower than EXCLUDE_TAGS_HIGH_FEE_THRESHOLD', () => {
        process.env.EXCLUDE_TAGS_HIGH_FEE_THRESHOLD = '10'
        process.env.EXCLUDE_TAGS_HIGH_FEE = 'omega/pizza'
        process.env.EXCLUDE_TAGS = 'omega alpha pizza/omega'
        const result = get_excluded_tags({ fee_rate: 5 })
        expect(result).toEqual([['omega'], ['alpha'], ['pizza', 'omega']])
    })

    test('should return correct format when tags contain multiple slashes', () => {
        process.env.EXCLUDE_TAGS = 'omega/alpha/pizza'
        const result = get_excluded_tags({ fee_rate: 0 })
        expect(result).toEqual([['omega', 'alpha', 'pizza']])
    })
})
