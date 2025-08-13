
// Automated API tests for Sakthi Autos backend
// Run with: npx jest testing/api.test.js

const request = require('supertest');
const baseURL = 'http://localhost:3000';

describe('Micro Coupon Inspection API', () => {
  let createdId;
  it('POST /api/micro-coupon - should create a new inspection', async () => {
    const res = await request(baseURL)
      .post('/api/micro-coupon')
      .send({
        disa: 'D1',
        pp_code: 'PP123',
        item_description: 'Test Item',
        nodularity_percentage: 85.5,
        remarks: 'Test remarks'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.record).toHaveProperty('id');
    createdId = res.body.record.id;
  });

  it('GET /api/micro-coupon - should list inspections', async () => {
    const res = await request(baseURL).get('/api/micro-coupon');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/micro-coupon/recent - should list recent inspections', async () => {
    const res = await request(baseURL).get('/api/micro-coupon/recent');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/micro-coupon/by-disa/D1 - should filter by DISA', async () => {
    const res = await request(baseURL).get('/api/micro-coupon/by-disa/D1');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('DELETE /api/micro-coupon/:id - should delete the created inspection', async () => {
    const res = await request(baseURL).delete(`/api/micro-coupon/${createdId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('deletedRecord');
  });
});

describe('QC Register API', () => {
  it('POST /api/qc-register - should create a new QC register record', async () => {
    const res = await request(baseURL)
      .post('/api/qc-register')
      .send({
        record_date: '2025-08-05',
        disa_line: 'D1',
        part_name: 'PartX',
        heat_code: 'H123',
        qty_moulds: 10,
        remarks: 'Test',
        c1: 3.1, si1: 2.1, mn1: 0.5, p1: 0.02, s1: 0.01, mg1: 0.04, f_l1: 0.01, cu1: 0.02, cr1: 0.01,
        c2: 3.2, si2: 2.2, mn2: 0.6, s2: 0.02, cr2: 0.02, cu2: 0.03, sn2: 0.01,
        pouring_time: '12:00:00', pouring_temp: 1450, pp_code: 'PP123', fc_no_heat_no: 'FC1',
        mg_kgs: 1.2, res_mg: 0.03, converter_percent: 95, rec_mg_percent: 90, stream_innoculat: 0.5, p_time_sec: 30,
        treatment_no: 'T1', con_no: 'C1', tapping_time: '12:30:00', corrective_addition_kgs: 0.1, tapping_wt_kgs: 100
      });
    expect([200,201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('record');
  });
});

describe('Time Study API', () => {
  let createdId;
  it('POST /api/time-study - should create a new time study record', async () => {
    const res = await request(baseURL)
      .post('/api/time-study')
      .send({
        shift: 'A',
        part_name: 'TestPart',
        heat_code: 'H001',
        grade: 'G1',
        c: 3.1, si: 2.1, mn: 0.5, p: 0.02, s: 0.01, cr: 0.01, ni: 0.01, al: 0.01, cu: 0.01, sn: 0.01, mo: 0.01,
        cac2_s: 0.01, fesi_sh: 0.01, femn_sic: 0.01, cu_fecr: 0.01, carbon_steel: 'CS1'
      });
    expect([200,201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('record');
    createdId = res.body.record.id;
  });

  it('GET /api/time-study/records - should list all time study records', async () => {
    const res = await request(baseURL).get('/api/time-study/records');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// Add more tests for QF07_FBQ_02, QF07_FBQ_03, and Time Study as needed
