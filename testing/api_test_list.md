# API List for Sakthi Autos

## Micro Coupon Inspection
- POST   `/api/micro-coupon`           - Create new inspection
- GET    `/api/micro-coupon`           - Get all inspections
- GET    `/api/micro-coupon/recent`    - Get recent inspections
- GET    `/api/micro-coupon/by-disa/:disa` - Get by DISA line
- DELETE `/api/micro-coupon/:id`       - Delete inspection

## QC Register
- POST   `/api/qc-register`            - Create new QC register record

## QF07 FBQ 02
- POST   `/api/qc`                     - Create new QC record
- GET    `/qc`                         - Get all QC records
- GET    `/products/search?query=...`  - Search products
- GET    `/master-data`                - Get master data
- GET    `/qc/last?product=...`        - Get last QC record for product
- POST   `/update-last-used`           - Update last used timestamp

## QF07 FBQ 03
- POST   `/api/qc/fbq03/hourly`        - Add hourly record
- POST   `/api/qc/fbq03/4hourly`       - Add 4-hourly record
- POST   `/api/qc/fbq03/bag-change`    - Add bag change record
- POST   `/api/qc/fbq03/gauge-test`    - Add gauge test record
- GET    `/api/qc/fbq03/:component`    - Get all records for component
- GET    `/api/qc/fbq03/:component/:eventType` - Get records by event type
- GET    `/api/qc/fbq03/latest/:component` - Get latest record for component
- GET    `/api/master-data`            - Get master data


## Time Study
- POST   `/api/time-study`             - Create new time study record
- GET    `/api/time-study/records`     - Get all time study records


# Next: Automated API Tests
- Create test scripts for each endpoint using a tool like `supertest` (Node.js), `pytest` (Python), or `curl`/Postman collections.
