const { get_excluded_tags, get_min_tag_sizes } = require('../utils') // replace with your actual file path

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

describe('get_min_tag_sizes', () => {
    test('should return correct format', () => {
        process.env.MIN_TAG_SIZES = 'block_9:1000 block_78:2000'
        const result = get_min_tag_sizes({ fee_rate: 0 })
        expect(result).toEqual({ 'block_9': 1000, 'block_78': 2000 })
    })

    test('should trim leading and trailing spaces', () => {
        process.env.MIN_TAG_SIZES = ' block_9:1000 block_78:2000 '
        const result = get_min_tag_sizes({ fee_rate: 0 })
        expect(result).toEqual({ 'block_9': 1000, 'block_78': 2000 })
    })

    test('should return null when MIN_TAG_SIZES is not set', () => {
        delete process.env.MIN_TAG_SIZES
        const result = get_min_tag_sizes({ fee_rate: 0 })
        expect(result).toBeNull()
    })
    
    test('should use high fee min tag sizes when fee_rate is higher than MIN_TAG_SIZES_HIGH_FEE_THRESHOLD', () => {
        process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD = '10'
        process.env.MIN_TAG_SIZES_HIGH_FEE = 'block_9:2000 block_78:3000'
        process.env.MIN_TAG_SIZES = 'block_9:1000 block_78:2000'
        const result = get_min_tag_sizes({ fee_rate: 20 })
        expect(result).toEqual({ 'block_9': 2000, 'block_78': 3000 })
    })

    test('should not use high fee min tag sizes when fee_rate is lower than MIN_TAG_SIZES_HIGH_FEE_THRESHOLD', () => {
        process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD = '10'
        process.env.MIN_TAG_SIZES_HIGH_FEE = 'block_9:2000 block_78:3000'
        process.env.MIN_TAG_SIZES = 'block_9:1000 block_78:2000'
        const result = get_min_tag_sizes({ fee_rate: 5 })
        expect(result).toEqual({ 'block_9': 1000, 'block_78': 2000 })
    })
})