const {
    get_excluded_tags,
    get_min_tag_sizes,
    get_included_tags,
    get_tag_by_address,
    sleep,
    get_scan_config,
    satoshi_to_BTC,
    get_max_tag_ages,
} = require('../../utils')

const { delete_scan_configs } = require('../../storage')

describe('get_excluded_tags', () => {
    test('should return correct format', () => {
        delete_scan_configs()
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
        expect(result).toEqual({ block_9: 1000, block_78: 2000 })
    })

    test('should trim leading and trailing spaces', () => {
        process.env.MIN_TAG_SIZES = ' block_9:1000 block_78:2000 '
        const result = get_min_tag_sizes({ fee_rate: 0 })
        expect(result).toEqual({ block_9: 1000, block_78: 2000 })
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
        expect(result).toEqual({ block_9: 2000, block_78: 3000 })
    })

    test('should use medium fee min tag sizes when fee_rate is higher than MIN_TAG_SIZES_MEDIUM_FEE_THRESHOLD but lower than MIN_TAG_SIZES_HIGH_FEE_THRESHOLD', () => {
        process.env.MIN_TAG_SIZES = 'vintage_nakamoto:1000 block_78:2000'
        process.env.MIN_TAG_SIZES_MEDIUM_FEE_THRESHOLD = 20
        process.env.MIN_TAG_SIZES_MEDIUM_FEE = 'vintage_nakamoto:5000 block_78:5000'
        process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD = 50
        process.env.MIN_TAG_SIZES_HIGH_FEE = 'vintage_nakamoto:10000 block_78:10000'
        const result = get_min_tag_sizes({ fee_rate: 30 })
        expect(result).toEqual({ vintage_nakamoto: 5000, block_78: 5000 })
    })

    test('should not use high fee min tag sizes when fee_rate is lower than MIN_TAG_SIZES_HIGH_FEE_THRESHOLD', () => {
        process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD = '10'
        process.env.MIN_TAG_SIZES_HIGH_FEE = 'block_9:2000 block_78:3000'
        process.env.MIN_TAG_SIZES = 'block_9:1000 block_78:2000'
        const result = get_min_tag_sizes({ fee_rate: 5 })
        expect(result).toEqual({ block_9: 1000, block_78: 2000 })
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
        const satoshi = 123456789
        const result = satoshi_to_BTC(satoshi)
        expect(result).toBe(1.23456789)
    })

    test('should correctly convert satoshi to BTC', () => {
        const satoshi = 6789
        const result = satoshi_to_BTC(satoshi)
        expect(result).toBe(0.00006789)
    })

    test('should remove trailing zeros', () => {
        const satoshi = 100000000
        const result = satoshi_to_BTC(satoshi)
        expect(result).toBe(1)
    })

    test('should remove trailing zeros', () => {
        const satoshi = 100050000
        const result = satoshi_to_BTC(satoshi)
        expect(result).toBe(1.0005)
    })

    test('should remove trailing zeros', () => {
        const satoshi = 20050010
        const result = satoshi_to_BTC(satoshi)
        expect(result).toBe(0.2005001)
    })

    test('should handle zero', () => {
        const satoshi = 0
        const result = satoshi_to_BTC(satoshi)
        expect(result).toBe(0)
    })
})

describe('get_tag_by_address', () => {
    test('should return correct format', () => {
        process.env.TAG_BY_ADDRESS = 'tag1:address1 tag2:address2'
        const result = get_tag_by_address()
        expect(result).toEqual({ tag1: 'address1', tag2: 'address2' })
    })

    test('should trim leading and trailing spaces', () => {
        process.env.TAG_BY_ADDRESS = ' tag1:address1      tag2:address2 '
        const result = get_tag_by_address()
        expect(result).toEqual({ tag1: 'address1', tag2: 'address2' })
    })

    test('should return null when TAG_BY_ADDRESS is not set', () => {
        delete process.env.TAG_BY_ADDRESS
        const result = get_tag_by_address()
        expect(result).toBeNull()
    })

    test('should return null when TAG_BY_ADDRESS is empty', () => {
        process.env.TAG_BY_ADDRESS = ' '
        const result = get_tag_by_address()
        expect(result).toBeNull()
    })

    test('should handle multiple tag-address pairs', () => {
        process.env.TAG_BY_ADDRESS = 'tag1:address1 tag2:address2 tag3:address3'
        const result = get_tag_by_address()
        expect(result).toEqual({ tag1: 'address1', tag2: 'address2', tag3: 'address3' })
    })
})

describe('sleep', () => {
    test('should wait for the specified amount of time', async () => {
        const startTime = Date.now()
        await sleep(1000) // wait for 1 second
        const endTime = Date.now()

        // Check if the difference between the start and end times is close to 1000 milliseconds
        // We use toBeGreaterThanOrEqual and toBeLessThan to account for slight variations in timing
        expect(endTime - startTime).toBeGreaterThanOrEqual(1000)
        expect(endTime - startTime).toBeLessThan(1010)
    })
})
describe('get_scan_config', () => {
    test('should return null when SPLIT_TRIGGER is not set', () => {
        delete_scan_configs()
        delete process.env.SPLIT_TRIGGER
        const result = get_scan_config({ fee_rate: 0 })
        expect(result.split_config).toEqual({ split_trigger: null, split_target_size_sats: null })
    })

    test('should return normal config when below medium fee threshold', () => {
        delete_scan_configs()
        process.env.SPLIT_TRIGGER = 'ALWAYS'
        process.env.SPLIT_UTXO_SIZE_SATS = '10000000'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD = '20'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE = 'NO_SATS'
        process.env.SPLIT_UTXO_SIZE_SATS_MEDIUM_FEE = '20000000'
        process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD = '40'
        process.env.SPLIT_TRIGGER_HIGH_FEE = 'NEVER'
        process.env.SPLIT_UTXO_SIZE_SATS_HIGH_FEE = '50000000'
        const result = get_scan_config({ fee_rate: 5 })
        expect(result.split_config).toEqual({ split_trigger: 'ALWAYS', split_target_size_sats: 10000000 })
    })

    test('should return medium fee', () => {
        delete_scan_configs()
        process.env.SPLIT_TRIGGER = 'ALWAYS'
        process.env.SPLIT_UTXO_SIZE_SATS = '10000000'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD = '20'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE = 'NO_SATS'
        process.env.SPLIT_UTXO_SIZE_SATS_MEDIUM_FEE = '20000000'
        process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD = '40'
        process.env.SPLIT_TRIGGER_HIGH_FEE = 'NEVER'
        process.env.SPLIT_UTXO_SIZE_SATS_HIGH_FEE = '50000000'
        const result = get_scan_config({ fee_rate: 25 })
        expect(result.split_config).toEqual({ split_trigger: 'NO_SATS', split_target_size_sats: 20000000 })
    })

    test('should return high fee', () => {
        delete_scan_configs()
        process.env.SPLIT_TRIGGER = 'ALWAYS'
        process.env.SPLIT_UTXO_SIZE_SATS = '10000000'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD = '20'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE = 'NO_SATS'
        process.env.SPLIT_UTXO_SIZE_SATS_MEDIUM_FEE = '20000000'
        process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD = '40'
        process.env.SPLIT_TRIGGER_HIGH_FEE = 'NEVER'
        process.env.SPLIT_UTXO_SIZE_SATS_HIGH_FEE = '50000000'
        const result = get_scan_config({ fee_rate: 45 })
        expect(result.split_config).toEqual({ split_trigger: 'NEVER', split_target_size_sats: 50000000 })
    })

    test('should return normal config when no fee thresholds set', () => {
        delete_scan_configs()
        process.env.SPLIT_TRIGGER = 'ALWAYS'
        process.env.SPLIT_UTXO_SIZE_SATS = '10000000'
        delete process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD
        delete process.env.SPLIT_TRIGGER_MEDIUM_FEE
        delete process.env.SPLIT_UTXO_SIZE_SATS_MEDIUM_FEE
        delete process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD
        delete process.env.SPLIT_TRIGGER_HIGH_FEE
        delete process.env.SPLIT_UTXO_SIZE_SATS_HIGH_FEE
        const result = get_scan_config({ fee_rate: 45 })
        expect(result.split_config).toEqual({ split_trigger: 'ALWAYS', split_target_size_sats: 10000000 })
    })

    test('should use saved split configs when fee increases past original threshold', () => {
        delete_scan_configs()
        process.env.SPLIT_TRIGGER = 'ALWAYS'
        process.env.SPLIT_UTXO_SIZE_SATS = '10000000'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD = '20'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE = 'NO_SATS'
        process.env.SPLIT_UTXO_SIZE_SATS_MEDIUM_FEE = '20000000'
        process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD = '40'
        process.env.SPLIT_TRIGGER_HIGH_FEE = 'NEVER'
        process.env.SPLIT_UTXO_SIZE_SATS_HIGH_FEE = '50000000'
        const result = get_scan_config({ fee_rate: 19 })
        expect(result.split_config).toEqual({ split_trigger: 'ALWAYS', split_target_size_sats: 10000000 })
        const result2 = get_scan_config({ fee_rate: 21 })
        expect(result2.split_config).toEqual({ split_trigger: 'ALWAYS', split_target_size_sats: 10000000 })
    })

    test('all combinations persist across thresholds', () => {
        delete_scan_configs()

        process.env.TAG_BY_ADDRESS = 'tag1:address1 tag2:address2'
        process.env.SPLIT_TRIGGER = 'ALWAYS'
        process.env.SPLIT_UTXO_SIZE_SATS = '10000000'
        process.env.EXCLUDE_TAGS = 'omega'
        process.env.MIN_TAG_SIZES = 'block_9:1000'
        process.env.INCLUDE_TAGS = 'special_name uncommon rare'

        process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD = '20'
        process.env.SPLIT_TRIGGER_MEDIUM_FEE = 'NO_SATS'
        process.env.SPLIT_UTXO_SIZE_SATS_MEDIUM_FEE = '20000000'
        process.env.EXCLUDE_TAGS_MEDIUM_FEE_THRESHOLD = '5'
        process.env.EXCLUDE_TAGS_MEDIUM_FEE = 'omega alpha'
        process.env.MIN_TAG_SIZES_MEDIUM_FEE = 'block_9:5000'
        process.env.MIN_TAG_SIZES_MEDIUM_FEE_THRESHOLD = '10'
        process.env.INCLUDE_TAGS_MEDIUM_FEE = 'uncommon rare'
        process.env.INCLUDE_TAGS_MEDIUM_FEE_THRESHOLD = '15'

        process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD = '40'
        process.env.SPLIT_TRIGGER_HIGH_FEE = 'NEVER'
        process.env.SPLIT_UTXO_SIZE_SATS_HIGH_FEE = '50000000'
        process.env.EXCLUDE_TAGS_HIGH_FEE_THRESHOLD = '10'
        process.env.EXCLUDE_TAGS_HIGH_FEE = 'omega alpha pizza'
        process.env.MIN_TAG_SIZES_HIGH_FEE = 'block_9:20000'
        process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD = '30'
        process.env.INCLUDE_TAGS_HIGH_FEE = 'rare'
        process.env.INCLUDE_TAGS_HIGH_FEE_THRESHOLD = '25'

        process.env.MAX_TAG_AGES = 'alpha:2009'

        const expected_result = {
            tag_by_address: { tag1: 'address1', tag2: 'address2' },
            excluded_tags: [['omega']],
            min_tag_sizes: { block_9: 1000 },
            max_tag_ages: { alpha: 2009 },
            included_tags: [['special_name'], ['uncommon'], ['rare']],
            split_config: { split_trigger: 'ALWAYS', split_target_size_sats: 10000000 },
        }
        expect(get_scan_config({ fee_rate: 4 })).toEqual(expected_result)
        // Cached result should be saved, so we should get the same result at higher fee levels.
        expect(get_scan_config({ fee_rate: 6 })).toEqual(expected_result)
        expect(get_scan_config({ fee_rate: 14 })).toEqual(expected_result)
        expect(get_scan_config({ fee_rate: 17 })).toEqual(expected_result)
        expect(get_scan_config({ fee_rate: 21 })).toEqual(expected_result)
        expect(get_scan_config({ fee_rate: 26 })).toEqual(expected_result)
        expect(get_scan_config({ fee_rate: 35 })).toEqual(expected_result)
        expect(get_scan_config({ fee_rate: 50 })).toEqual(expected_result)

        // Now if we delete the cached config, we'll get fresh ones.
        delete_scan_configs()
        expect(get_scan_config({ fee_rate: 50 })).toEqual({
            tag_by_address: { tag1: 'address1', tag2: 'address2' },
            excluded_tags: [['omega'], ['alpha'], ['pizza']],
            min_tag_sizes: { block_9: 20000 },
            included_tags: [['rare']],
            max_tag_ages: { alpha: 2009 },
            split_config: { split_trigger: 'NEVER', split_target_size_sats: 50000000 },
        })
    })
})

describe('get_max_tag_ages', () => {
    test('should return correct format', () => {
        process.env.MAX_TAG_AGES = 'alpha:2009 omega:2000'
        const result = get_max_tag_ages({ fee_rate: 0 })
        expect(result).toEqual({ alpha: 2009, omega: 2000 })
    })

    test('should trim leading and trailing spaces', () => {
        process.env.MAX_TAG_AGES = ' alpha:2009 omega:2000 '
        const result = get_max_tag_ages({ fee_rate: 0 })
        expect(result).toEqual({ alpha: 2009, omega: 2000 })
    })

    test('should return null when MAX_TAG_AGES is not set', () => {
        delete process.env.MAX_TAG_AGES
        const result = get_max_tag_ages({ fee_rate: 0 })
        expect(result).toBeNull()
    })

    test('should use high fee max tag ages when fee_rate is higher than MAX_TAG_AGES_HIGH_FEE_THRESHOLD', () => {
        process.env.MAX_TAG_AGES_HIGH_FEE_THRESHOLD = '10'
        process.env.MAX_TAG_AGES_HIGH_FEE = 'alpha:2000 omega:3000'
        process.env.MAX_TAG_AGES = 'alpha:2009 omega:2000'
        const result = get_max_tag_ages({ fee_rate: 20 })
        expect(result).toEqual({ alpha: 2000, omega: 3000 })
    })

    test('should use medium fee max tag ages when fee_rate is higher than MAX_TAG_AGES_MEDIUM_FEE_THRESHOLD but lower than MAX_TAG_AGES_HIGH_FEE_THRESHOLD', () => {
        process.env.MAX_TAG_AGES = 'vintage_nakamoto:2009 omega:2000'
        process.env.MAX_TAG_AGES_MEDIUM_FEE_THRESHOLD = 20
        process.env.MAX_TAG_AGES_MEDIUM_FEE = 'vintage_nakamoto:2009 omega:2010'
        process.env.MAX_TAG_AGES_HIGH_FEE_THRESHOLD = 50
        process.env.MAX_TAG_AGES_HIGH_FEE = 'vintage_nakamoto:2005 omega:2006'
        const result = get_max_tag_ages({ fee_rate: 30 })
        expect(result).toEqual({ vintage_nakamoto: 2009, omega: 2010 })
    })

    test('should not use high fee max tag ages when fee_rate is lower than MAX_TAG_AGES_HIGH_FEE_THRESHOLD', () => {
        process.env.MAX_TAG_AGES_HIGH_FEE_THRESHOLD = '10'
        process.env.MAX_TAG_AGES_HIGH_FEE = 'alpha:2000 omega:3000'
        process.env.MAX_TAG_AGES = 'alpha:2009 omega:2000'
        const result = get_max_tag_ages({ fee_rate: 5 })
        expect(result).toEqual({ alpha: 2009, omega: 2000 })
    })
})
