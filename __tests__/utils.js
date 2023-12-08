const { get_excluded_tags, get_min_tag_sizes, get_included_tags, satoshi_to_BTC } = require('../utils')

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
        process.env.EXCLUDE_TAGS_MEDIUM_FEE_THRESHOLD = '5'
        process.env.EXCLUDE_TAGS_MEDIUM_FEE = 'special_name'
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

    test('should use medium fee excluded tags when fee_rate is in the middle', () => {
        process.env.EXCLUDE_TAGS_HIGH_FEE_THRESHOLD = '20'
        process.env.EXCLUDE_TAGS_HIGH_FEE = 'omega/pizza'
        process.env.EXCLUDE_TAGS_MEDIUM_FEE_THRESHOLD = '10'
        process.env.EXCLUDE_TAGS_MEDIUM_FEE = 'special_name'
        process.env.EXCLUDE_TAGS = 'omega alpha pizza/omega'
        const result = get_excluded_tags({ fee_rate: 15 })
        expect(result).toEqual([['special_name']])
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

    test('should use medium fee min tag sizes when fee_rate is higher than MIN_TAG_SIZES_MEDIUM_FEE_THRESHOLD but lower than MIN_TAG_SIZES_HIGH_FEE_THRESHOLD', () => {
        process.env.MIN_TAG_SIZES = "vintage_nakamoto:1000 block_78:2000"
        process.env.MIN_TAG_SIZES_MEDIUM_FEE_THRESHOLD = 20
        process.env.MIN_TAG_SIZES_MEDIUM_FEE = "vintage_nakamoto:5000 block_78:5000"
        process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD = 50
        process.env.MIN_TAG_SIZES_HIGH_FEE = "vintage_nakamoto:10000 block_78:10000"
        const result = get_min_tag_sizes({ fee_rate: 30 })
        expect(result).toEqual({ 'vintage_nakamoto': 5000, 'block_78': 5000 })
    })

    test('should not use high fee min tag sizes when fee_rate is lower than MIN_TAG_SIZES_HIGH_FEE_THRESHOLD', () => {
        process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD = '10'
        process.env.MIN_TAG_SIZES_HIGH_FEE = 'block_9:2000 block_78:3000'
        process.env.MIN_TAG_SIZES = 'block_9:1000 block_78:2000'
        const result = get_min_tag_sizes({ fee_rate: 5 })
        expect(result).toEqual({ 'block_9': 1000, 'block_78': 2000 })
    })
})

describe('get_included_tags', () => {
    test('should return correct format', () => {
        process.env.INCLUDE_TAGS = 'omega alpha pizza/omega omega/alpha/pizza'
        const result = get_included_tags({ fee_rate: 0 })
        expect(result).toEqual([['omega'], ['alpha'], ['pizza', 'omega'], ['omega', 'alpha', 'pizza']])
    })

    test('should trim leading and trailing spaces', () => {
        process.env.INCLUDE_TAGS = ' omega alpha pizza/omega '
        const result = get_included_tags({ fee_rate: 0 })
        expect(result).toEqual([['omega'], ['alpha'], ['pizza', 'omega']])
    })

    test('should return empty array when INCLUDE_TAGS is empty string', () => {
        process.env.INCLUDE_TAGS = ''
        const result = get_included_tags({ fee_rate: 0 })
        expect(result).toEqual([])
    })

    test('should return empty array when INCLUDE_TAGS is not set', () => {
        delete process.env.INCLUDE_TAGS
        const result = get_included_tags({ fee_rate: 0 })
        expect(result).toEqual([])
    })

    test('should return correct format when tags contain multiple slashes', () => {
        process.env.INCLUDE_TAGS = 'omega/alpha/pizza'
        const result = get_included_tags({ fee_rate: 0 })
        expect(result).toEqual([['omega', 'alpha', 'pizza']])
    })

    test('should use high fee included tags when fee_rate is higher than INCLUDE_TAGS_HIGH_FEE_THRESHOLD', () => {
        process.env.INCLUDE_TAGS_HIGH_FEE_THRESHOLD = '10'
        process.env.INCLUDE_TAGS_HIGH_FEE = 'alpha/pizza'
        process.env.INCLUDE_TAGS_MEDIUM_FEE_THRESHOLD = '5'
        process.env.INCLUDE_TAGS_MEDIUM_FEE = 'special_name'
        process.env.INCLUDE_TAGS = 'omega alpha pizza/omega'
        const result = get_included_tags({ fee_rate: 20 })
        expect(result).toEqual([['alpha', 'pizza']])
    })

    test('should not use high fee included tags when fee_rate is lower than INCLUDE_TAGS_HIGH_FEE_THRESHOLD', () => {
        process.env.INCLUDE_TAGS_HIGH_FEE_THRESHOLD = '10'
        process.env.INCLUDE_TAGS_HIGH_FEE = 'omega/pizza'
        process.env.INCLUDE_TAGS = 'omega alpha pizza/omega'
        const result = get_included_tags({ fee_rate: 5 })
        expect(result).toEqual([['omega'], ['alpha'], ['pizza', 'omega']])
    })

    test('should use medium fee included tags when fee_rate is in the middle', () => {
        process.env.INCLUDE_TAGS_HIGH_FEE_THRESHOLD = '20'
        process.env.INCLUDE_TAGS_HIGH_FEE = 'omega/pizza'
        process.env.INCLUDE_TAGS_MEDIUM_FEE_THRESHOLD = '10'
        process.env.INCLUDE_TAGS_MEDIUM_FEE = 'special_name'
        process.env.INCLUDE_TAGS = 'omega alpha pizza/omega'
        const result = get_included_tags({ fee_rate: 15 })
        expect(result).toEqual([['special_name']])
    })
})

describe('satoshi_to_BTC', () => {
    test('should correctly convert satoshi to BTC', () => {
        const satoshi = 123456789;
        const result = satoshi_to_BTC(satoshi);
        expect(result).toBe(1.23456789);
    });

    test('should correctly convert satoshi to BTC', () => {
        const satoshi = 6789;
        const result = satoshi_to_BTC(satoshi);
        expect(result).toBe(0.00006789);
    });

    test('should remove trailing zeros', () => {
        const satoshi = 100000000;
        const result = satoshi_to_BTC(satoshi);
        expect(result).toBe(1);
    });

    test('should remove trailing zeros', () => {
        const satoshi = 100050000;
        const result = satoshi_to_BTC(satoshi);
        expect(result).toBe(1.0005);
    });

    test('should remove trailing zeros', () => {
        const satoshi = 20050010;
        const result = satoshi_to_BTC(satoshi);
        expect(result).toBe(0.2005001);
    });

    test('should handle zero', () => {
        const satoshi = 0;
        const result = satoshi_to_BTC(satoshi);
        expect(result).toBe(0);
    });
});