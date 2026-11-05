process.env.JWT_SECRET = process.env.JWT_SECRET?.length >= 32 ? process.env.JWT_SECRET : 'phase-two-test-secret-that-is-long-enough'
process.env.MONGODB_TEST_URI ||= 'mongodb://127.0.0.1:27017/fieldnote_phase2_test?replicaSet=rs0'
