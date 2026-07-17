import { dbInsert, dbFind, dbUpdate, dbDelete, dbClear } from './db';

describe('Database operations', () => {
  beforeEach((done) => {
    dbClear((err) => done());
  });

  it('should insert a record', (done) => {
    dbInsert('r1', 'test data', (err, record) => {
      expect(err).toBeNull();
      expect(record).toBeDefined();
      expect(record!.id).toBe('r1');
      expect(record!.data).toBe('test data');
      done();
    });
  });

  it('should find a record by id', (done) => {
    dbInsert('r2', 'find me', (err) => {
      expect(err).toBeNull();
      dbFind('r2', (err2, record) => {
        expect(err2).toBeNull();
        expect(record!.data).toBe('find me');
        done();
      });
    });
  });

  it('should return error for non-existent record', (done) => {
    dbFind('missing', (err) => {
      expect(err).toBeDefined();
      expect(err!.message).toContain('not found');
      done();
    });
  });

  it('should update a record', (done) => {
    dbInsert('r3', 'original', (err) => {
      expect(err).toBeNull();
      dbUpdate('r3', 'updated', (err2, record) => {
        expect(err2).toBeNull();
        expect(record!.data).toBe('updated');
        done();
      });
    });
  });

  it('should delete a record', (done) => {
    dbInsert('r4', 'delete me', (err) => {
      expect(err).toBeNull();
      dbDelete('r4', (err2, result) => {
        expect(err2).toBeNull();
        expect(result).toBe(true);
        dbFind('r4', (err3) => {
          expect(err3).toBeDefined();
          done();
        });
      });
    });
  });

  it('should reject duplicate insert', (done) => {
    dbInsert('r5', 'first', (err) => {
      expect(err).toBeNull();
      dbInsert('r5', 'duplicate', (err2) => {
        expect(err2).toBeDefined();
        expect(err2!.message).toContain('already exists');
        done();
      });
    });
  });
});
