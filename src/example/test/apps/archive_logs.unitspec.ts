import {dateRange} from "../../apps/archive_logs";

describe('archiving', () => {

    it('should find the right date', () => {

        const range = dateRange();
        expect(range.from.getUTCHours()).toEqual(0)
        expect(range.from.getUTCMinutes()).toEqual(0)

        expect(range.to.getUTCHours()).toEqual(23)
        expect(range.to.getUTCMinutes()).toEqual(59)
    });
});
