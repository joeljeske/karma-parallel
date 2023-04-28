(before || beforeAll)(() => {
  GlobalConditions.beforeAll();
});

beforeEach(() => {
  GlobalConditions.beforeEach();
});

afterEach(() => {
  GlobalConditions.afterEach();
});

(after || afterAll)(() => {
  GlobalConditions.afterAll();
});



describe('set global conditions', function() {
  describe('first subject', function() {
    it('has a test', function() {
      expect(GlobalConditions.testRun());
    });
    it('has another test', function() {
      expect(GlobalConditions.testRun());
    });
  });
  describe('second subject', function() {
    it('has a test', function() {
      expect(GlobalConditions.testRun());
    });
    it('has another test', function() {
      expect(GlobalConditions.testRun());
    });
  });
  describe('third subject', function() {
    it('has a test', function() {
      expect(GlobalConditions.testRun());
    });
    it('has another test', function() {
      expect(GlobalConditions.testRun());
    });
  });
});
