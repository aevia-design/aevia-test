// TO-DOS #99: pure rules for the review lock + issue flow.
// See docs/briefs/review-lock.md and work/review-lock/decision.md.
const {
  canStaffSave,
  canCustomerSave,
  canApprove,
  canAcceptBlockingReport,
  revisionMatches,
  mapCustomerToStaffUpdates,
  buildReportEntry,
} = require('../functions/review-lock-utils');

describe('canStaffSave', () => {
  test('allowed before review_sent', () => {
    expect(canStaffSave('new')).toBe(true);
    expect(canStaffSave('designing')).toBe(true);
    expect(canStaffSave('needs_info')).toBe(true);
  });
  test('allowed in issue (unlocked for a fix)', () => {
    expect(canStaffSave('issue')).toBe(true);
  });
  test('refused from review_sent on', () => {
    expect(canStaffSave('review_sent')).toBe(false);
    expect(canStaffSave('approved')).toBe(false);
    expect(canStaffSave('paid')).toBe(false);
    expect(canStaffSave('sent_to_print')).toBe(false);
  });
});

describe('canCustomerSave', () => {
  test('allowed only in review_sent', () => {
    expect(canCustomerSave('review_sent')).toBe(true);
  });
  test('refused everywhere else, including issue', () => {
    expect(canCustomerSave('issue')).toBe(false);
    expect(canCustomerSave('approved')).toBe(false);
    expect(canCustomerSave('new')).toBe(false);
    expect(canCustomerSave(undefined)).toBe(false);
  });
});

describe('canApprove', () => {
  test('refused while a blocking issue is open', () => {
    expect(canApprove('issue')).toBe(false);
  });
  test('refused once already approved/paid', () => {
    expect(canApprove('approved')).toBe(false);
    expect(canApprove('paid')).toBe(false);
  });
  test('allowed in review_sent', () => {
    expect(canApprove('review_sent')).toBe(true);
  });
});

describe('canAcceptBlockingReport', () => {
  test('only accepted in review_sent', () => {
    expect(canAcceptBlockingReport('review_sent')).toBe(true);
    expect(canAcceptBlockingReport('approved')).toBe(false);
    expect(canAcceptBlockingReport('issue')).toBe(false);
    expect(canAcceptBlockingReport('new')).toBe(false);
  });
});

describe('revisionMatches', () => {
  test('absent order revision reads as 0', () => {
    expect(revisionMatches({}, 0)).toBe(true);
    expect(revisionMatches({}, undefined)).toBe(true);
  });
  test('matches the stored revision', () => {
    expect(revisionMatches({ bookRevision: 4 }, 4)).toBe(true);
  });
  test('mismatch is refused', () => {
    expect(revisionMatches({ bookRevision: 4 }, 3)).toBe(false);
    expect(revisionMatches({ bookRevision: 4 }, undefined)).toBe(false);
  });
});

describe('mapCustomerToStaffUpdates', () => {
  test('copies customer fields onto their staff counterparts', () => {
    const updates = mapCustomerToStaffUpdates({
      customerBookAssignments: { a: 1 },
      customerCaptions: { a: 'hi' },
      customerCaptionLines: { a: ['hi'] },
      customerCaptionStyles: { a: {} },
      customerCoverCaptionStyles: { cover: {} },
      customerHeartCrop: { a: { x: 1 } },
    });
    expect(updates.staffBookAssignments).toEqual({ a: 1 });
    expect(updates.staffBookCaptions).toEqual({ a: 'hi' });
    expect(updates.staffBookCaptionLines).toEqual({ a: ['hi'] });
    expect(updates.staffSpreadCaptionStyles).toEqual({ a: {} });
    expect(updates.staffCoverCaptionStyles).toEqual({ cover: {} });
    expect(updates.staffHeartCrop).toEqual({ a: { x: 1 } });
  });

  test('leaves a field untouched when the customer field is absent', () => {
    const updates = mapCustomerToStaffUpdates({});
    expect(updates.staffBookAssignments).toBeUndefined();
  });

  test('drops recorded caption lines when there are no customer lines (staleness guard)', () => {
    const updates = mapCustomerToStaffUpdates({ customerCaptions: { a: 'hi' } });
    expect(updates.staffBookCaptionLines).toBeNull();
  });
});

describe('buildReportEntry', () => {
  test('builds a blocking entry', () => {
    const entry = buildReportEntry('blocking', 'the cover is blurry', 'TS');
    expect(entry).toEqual({ type: 'blocking', message: 'the cover is blurry', at: 'TS' });
  });
  test('anything other than blocking is stored as feedback', () => {
    expect(buildReportEntry('feedback', 'love it', 'TS').type).toBe('feedback');
    expect(buildReportEntry('whatever', 'love it', 'TS').type).toBe('feedback');
  });
  test('trims and caps message length', () => {
    const entry = buildReportEntry('feedback', '  ' + 'x'.repeat(2000) + '  ', 'TS');
    expect(entry.message.length).toBe(1000);
  });
});
