window.GlobalConditions = {
  beforeAllCount: 0,
  beforeEachCount: 0,
  afterEachCount: 0,
  afterAllCount: 0,
  testRunCount: 0,
  beforeAll: function beforeAll() { this.beforeAllCount++; },
  beforeEach: function beforeEach() { this.beforeEachCount++; },
  afterEach: function afterEach() { this.afterEachCount++; },
  afterAll: function afterAll() { this.afterAllCount++; },
  testRun: function testRun() { this.testRunCount++; },
};
