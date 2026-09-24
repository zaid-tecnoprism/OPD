import state, { generateId, generateTokenNumber, uuid } from './store.js';

export function seedData() {
  return new Promise((resolve) => {
    const departments = [
      { id: 'D001', name: 'General Medicine', description: 'Common illnesses and general health checkups', tokenPrefix: 'GM' },
      { id: 'D002', name: 'ENT', description: 'Ear, Nose and Throat specialist', tokenPrefix: 'ENT' },
      { id: 'D003', name: 'Gynecology', description: "Women's health specialist", tokenPrefix: 'GYN' },
      { id: 'D004', name: 'Pediatrics', description: 'Child health specialist', tokenPrefix: 'PED' },
      { id: 'D005', name: 'Dermatology', description: 'Skin and hair specialist', tokenPrefix: 'DER' },
      { id: 'D006', name: 'Orthopedics', description: 'Bone and joint specialist', tokenPrefix: 'ORT' },
      { id: 'D007', name: 'Cardiology', description: 'Heart and cardiovascular specialist', tokenPrefix: 'CAR' }
    ];
    state.departments = departments;

    const doctors = [
      { id: 'DOC001', name: 'Dr. Rajesh Kumar', department: 'General Medicine', available: true, tokenPrefix: 'GM' },
      { id: 'DOC002', name: 'Dr. Priya Sharma', department: 'ENT', available: true, tokenPrefix: 'ENT' },
      { id: 'DOC003', name: 'Dr. Meera Patel', department: 'Gynecology', available: true, tokenPrefix: 'GYN' },
      { id: 'DOC004', name: 'Dr. Amit Verma', department: 'Pediatrics', available: true, tokenPrefix: 'PED' },
      { id: 'DOC005', name: 'Dr. Sneha Gupta', department: 'Dermatology', available: true, tokenPrefix: 'DER' },
      { id: 'DOC006', name: 'Dr. Vikram Singh', department: 'Orthopedics', available: true, tokenPrefix: 'ORT' },
      { id: 'DOC007', name: 'Dr. Anjali Desai', department: 'Cardiology', available: true, tokenPrefix: 'CAR' }
    ];
    state.doctors = doctors;

    const patients = [
      { id: 'P001', firstName: 'Rahul', lastName: 'Gupta', gender: 'Male', age: 32, weight: 72, mobileNumber: '9876543210', email: 'rahul.gupta@example.com', address: '123 MG Road, Mumbai', createdAt: '2026-07-15T09:00:00.000Z' },
      { id: 'P002', firstName: 'Priya', lastName: 'Singh', gender: 'Female', age: 28, weight: 58, mobileNumber: '9876543211', email: 'priya.singh@example.com', address: '456 Sector 15, Delhi', createdAt: '2026-07-20T10:30:00.000Z' },
      { id: 'P003', firstName: 'Amit', lastName: 'Sharma', gender: 'Male', age: 45, weight: 85, mobileNumber: '9876543212', email: 'amit.sharma@example.com', address: '789 Park Street, Kolkata', createdAt: '2026-08-01T11:00:00.000Z' },
      { id: 'P004', firstName: 'Sneha', lastName: 'Verma', gender: 'Female', age: 5, weight: 18, mobileNumber: '9876543213', email: 'sneha.verma@example.com', address: '321 Marine Drive, Mumbai', createdAt: '2026-08-05T14:00:00.000Z' },
      { id: 'P005', firstName: 'Vijay', lastName: 'Khan', gender: 'Male', age: 55, weight: 90, mobileNumber: '9876543214', email: 'vijay.khan@example.com', address: '567 Brigade Road, Bangalore', createdAt: '2026-08-10T16:00:00.000Z' },
      { id: 'P006', firstName: 'Anita', lastName: 'Desai', gender: 'Female', age: 38, weight: 65, mobileNumber: '9876543215', email: 'anita.desai@example.com', address: '234 Residency Road, Pune', createdAt: '2026-08-15T09:30:00.000Z' }
    ];
    state.patients = patients;
    state.counters.patientId = 6;

    const medicines = [
      { id: 'MED001', name: 'Paracetamol 500mg', category: 'Analgesic', price: 2.50, gstPercent: 12, stockQuantity: 500, unit: 'tablet' },
      { id: 'MED002', name: 'Amoxicillin 250mg', category: 'Antibiotic', price: 8.00, gstPercent: 12, stockQuantity: 300, unit: 'capsule' },
      { id: 'MED003', name: 'Cetirizine 10mg', category: 'Antihistamine', price: 3.50, gstPercent: 12, stockQuantity: 400, unit: 'tablet' },
      { id: 'MED004', name: 'Omeprazole 20mg', category: 'Antacid', price: 5.00, gstPercent: 12, stockQuantity: 250, unit: 'capsule' },
      { id: 'MED005', name: 'Ibuprofen 400mg', category: 'NSAID', price: 4.00, gstPercent: 12, stockQuantity: 350, unit: 'tablet' },
      { id: 'MED006', name: 'Azithromycin 500mg', category: 'Antibiotic', price: 25.00, gstPercent: 12, stockQuantity: 200, unit: 'tablet' },
      { id: 'MED007', name: 'Montelukast 10mg', category: 'Respiratory', price: 15.00, gstPercent: 12, stockQuantity: 180, unit: 'tablet' },
      { id: 'MED008', name: 'Metformin 500mg', category: 'Antidiabetic', price: 6.00, gstPercent: 12, stockQuantity: 220, unit: 'tablet' },
      { id: 'MED009', name: 'Amlodipine 5mg', category: 'Antihypertensive', price: 7.50, gstPercent: 12, stockQuantity: 200, unit: 'tablet' },
      { id: 'MED010', name: 'Atorvastatin 20mg', category: 'Statin', price: 30.00, gstPercent: 12, stockQuantity: 150, unit: 'tablet' },
      { id: 'MED011', name: 'Clotrimazole Cream', category: 'Antifungal', price: 45.00, gstPercent: 18, stockQuantity: 100, unit: 'tube' },
      { id: 'MED012', name: 'Diclofenac Gel', category: 'Topical NSAID', price: 60.00, gstPercent: 18, stockQuantity: 80, unit: 'tube' }
    ];
    state.medicines = medicines;

    const tests = [
      { id: 'T001', name: 'Complete Blood Count (CBC)', price: 250.00, gstPercent: 5, description: 'Red blood cells, white blood cells, platelets count' },
      { id: 'T002', name: 'Blood Sugar Test (Fasting)', price: 80.00, gstPercent: 5, description: 'Fasting blood glucose level' },
      { id: 'T003', name: 'Urine Routine', price: 100.00, gstPercent: 5, description: 'Urine analysis routine' },
      { id: 'T004', name: 'Chest X-Ray', price: 300.00, gstPercent: 5, description: 'PA view chest radiograph' },
      { id: 'T005', name: 'ECG', price: 200.00, gstPercent: 5, description: '12 lead electrocardiogram' },
      { id: 'T006', name: 'Thyroid Profile', price: 450.00, gstPercent: 5, description: 'T3, T4, TSH levels' },
      { id: 'T007', name: 'Lipid Profile', price: 500.00, gstPercent: 5, description: 'Cholesterol, HDL, LDL, Triglycerides' },
      { id: 'T008', name: 'Liver Function Test', price: 600.00, gstPercent: 5, description: 'SGOT, SGPT, Bilirubin, etc.' },
      { id: 'T009', name: 'Sputum Culture', price: 350.00, gstPercent: 5, description: 'Culture and sensitivity test' },
      { id: 'T010', name: 'Skin Allergy Test', price: 800.00, gstPercent: 5, description: 'Patch testing for common allergens' },
      { id: 'T011', name: 'Bone Density Scan', price: 1200.00, gstPercent: 5, description: 'DEXA scan for bone health' },
      { id: 'T012', name: 'Echocardiogram', price: 1500.00, gstPercent: 5, description: 'Ultrasound of the heart' }
    ];
    state.tests = tests;

    state.counters.visitId = 4;

    const visit1 = {
      id: 'V001', patientId: 'P001', visitDate: '2026-09-10T09:30:00.000Z',
      mainProblem: 'Fever and body pain',
      symptoms: 'Fever, cough, body pain, headache', duration: '3 days',
      severity: 'Moderate', previousOccurrence: 'No',
      allergies: 'No known allergies', currentMedication: 'Paracetamol SOS',
      additionalInformation: '', department: 'General Medicine', priority: 'routine',
      token: 'GM-001', aiStatus: 'completed', visitStatus: 'completed',
      doctorId: 'DOC001',
      reportedSymptoms: { fever: true, cough: true, cold: false, soreThroat: false, headache: true, bodyPain: true, stomachPain: false, vomiting: false, diarrhea: false, dizziness: false, breathingDifficulty: false, chestDiscomfort: false, skinProblem: false, other: '' }
    };

    const visit2 = {
      id: 'V002', patientId: 'P001', visitDate: '2026-09-15T11:00:00.000Z',
      mainProblem: 'Stomach pain and vomiting',
      symptoms: 'Stomach pain, vomiting, dizziness', duration: '1 day',
      severity: 'Moderate', previousOccurrence: 'Yes',
      allergies: 'Penicillin', currentMedication: 'Omeprazole',
      additionalInformation: 'Had spicy food last night', department: 'General Medicine', priority: 'routine',
      token: 'GM-005', aiStatus: 'completed', visitStatus: 'completed',
      doctorId: 'DOC001',
      reportedSymptoms: { fever: false, cough: false, cold: false, soreThroat: false, headache: false, bodyPain: false, stomachPain: true, vomiting: true, diarrhea: false, dizziness: true, breathingDifficulty: false, chestDiscomfort: false, skinProblem: false, other: '' }
    };

    const visit3 = {
      id: 'V003', patientId: 'P002', visitDate: '2026-09-16T10:00:00.000Z',
      mainProblem: 'Ear pain and sore throat',
      symptoms: 'Ear pain, sore throat, cold', duration: '2 days',
      severity: 'Mild', previousOccurrence: 'No',
      allergies: 'No', currentMedication: 'None',
      additionalInformation: '', department: 'ENT', priority: 'routine',
      token: 'ENT-001', aiStatus: 'completed', visitStatus: 'completed',
      doctorId: 'DOC002',
      reportedSymptoms: { fever: false, cough: false, cold: true, soreThroat: true, headache: false, bodyPain: false, stomachPain: false, vomiting: false, diarrhea: false, dizziness: false, breathingDifficulty: false, chestDiscomfort: false, skinProblem: false, other: '' }
    };

    const visit4 = {
      id: 'V004', patientId: 'P005', visitDate: '2026-09-17T14:30:00.000Z',
      mainProblem: 'Chest discomfort and dizziness',
      symptoms: 'Chest discomfort, dizziness, breathing difficulty', duration: '2 weeks',
      severity: 'Severe', previousOccurrence: 'Yes',
      allergies: 'No', currentMedication: 'Amlodipine 5mg',
      additionalInformation: 'High blood pressure history', department: 'Cardiology', priority: 'priority review',
      token: 'CAR-001', aiStatus: 'completed', visitStatus: 'completed',
      doctorId: 'DOC007',
      reportedSymptoms: { fever: false, cough: false, cold: false, soreThroat: false, headache: false, bodyPain: false, stomachPain: false, vomiting: false, diarrhea: false, dizziness: true, breathingDifficulty: true, chestDiscomfort: true, skinProblem: false, other: '' }
    };

    state.visits = [visit1, visit2, visit3, visit4];

    state.counters.tokenCounters['GM'] = 5;
    state.counters.tokenCounters['ENT'] = 1;
    state.counters.tokenCounters['CAR'] = 1;

    state.tokens = [
      { id: uuid(), token: 'GM-001', patientId: 'P001', visitId: 'V001', department: 'General Medicine', priority: 'routine', doctorId: 'DOC001', status: 'completed', createdAt: '2026-09-10T09:30:00.000Z' },
      { id: uuid(), token: 'GM-005', patientId: 'P001', visitId: 'V002', department: 'General Medicine', priority: 'routine', doctorId: 'DOC001', status: 'completed', createdAt: '2026-09-15T11:00:00.000Z' },
      { id: uuid(), token: 'ENT-001', patientId: 'P002', visitId: 'V003', department: 'ENT', priority: 'routine', doctorId: 'DOC002', status: 'completed', createdAt: '2026-09-16T10:00:00.000Z' },
      { id: uuid(), token: 'CAR-001', patientId: 'P005', visitId: 'V004', department: 'Cardiology', priority: 'priority review', doctorId: 'DOC007', status: 'completed', createdAt: '2026-09-17T14:30:00.000Z' }
    ];

    const prescriptions = [
      {
        id: uuid(), patientId: 'P001', visitId: 'V001', doctorId: 'DOC001',
        diagnosis: 'Viral Fever with Upper Respiratory Infection',
        medicines: [
          { medicineId: 'MED001', name: 'Paracetamol 500mg', dosage: '1 tab', frequency: 'TDS', duration: '3 days', quantity: 9, instructions: 'After food' },
          { medicineId: 'MED005', name: 'Ibuprofen 400mg', dosage: '1 tab', frequency: 'BD', duration: '3 days', quantity: 6, instructions: 'After food' },
          { medicineId: 'MED003', name: 'Cetirizine 10mg', dosage: '1 tab', frequency: 'HS', duration: '3 days', quantity: 3, instructions: 'At bedtime' }
        ],
        tests: [{ testId: 'T001', name: 'Complete Blood Count (CBC)' }],
        doctorNotes: 'Drink plenty of fluids. Rest. Report if fever persists beyond 3 days.',
        consultationFee: 500, createdAt: '2026-09-10T10:15:00.000Z'
      },
      {
        id: uuid(), patientId: 'P001', visitId: 'V002', doctorId: 'DOC001',
        diagnosis: 'Acute Gastritis with Gastroenteritis',
        medicines: [
          { medicineId: 'MED004', name: 'Omeprazole 20mg', dosage: '1 cap', frequency: 'OD', duration: '7 days', quantity: 7, instructions: 'Before breakfast' },
          { medicineId: 'MED002', name: 'Amoxicillin 250mg', dosage: '1 cap', frequency: 'TDS', duration: '5 days', quantity: 15, instructions: 'After food' }
        ],
        tests: [{ testId: 'T003', name: 'Urine Routine' }],
        doctorNotes: 'Avoid spicy and oily food. Light diet. Maintain hydration.',
        consultationFee: 500, createdAt: '2026-09-15T11:45:00.000Z'
      },
      {
        id: uuid(), patientId: 'P002', visitId: 'V003', doctorId: 'DOC002',
        diagnosis: 'Acute Otitis Media with Pharyngitis',
        medicines: [
          { medicineId: 'MED006', name: 'Azithromycin 500mg', dosage: '1 tab', frequency: 'OD', duration: '5 days', quantity: 5, instructions: '1 hour before food' },
          { medicineId: 'MED001', name: 'Paracetamol 500mg', dosage: '1 tab', frequency: 'SOS', duration: '5 days', quantity: 10, instructions: 'For pain/fever' }
        ],
        tests: [],
        doctorNotes: 'Warm saline gargles twice daily. Avoid cold beverages.',
        consultationFee: 600, createdAt: '2026-09-16T10:45:00.000Z'
      },
      {
        id: uuid(), patientId: 'P005', visitId: 'V004', doctorId: 'DOC007',
        diagnosis: 'Hypertensive Heart Disease - Need for further evaluation',
        medicines: [
          { medicineId: 'MED009', name: 'Amlodipine 5mg', dosage: '1 tab', frequency: 'OD', duration: '30 days', quantity: 30, instructions: 'Morning after breakfast' },
          { medicineId: 'MED010', name: 'Atorvastatin 20mg', dosage: '1 tab', frequency: 'HS', duration: '30 days', quantity: 30, instructions: 'At bedtime' }
        ],
        tests: [
          { testId: 'T005', name: 'ECG' },
          { testId: 'T007', name: 'Lipid Profile' },
          { testId: 'T012', name: 'Echocardiogram' }
        ],
        doctorNotes: 'Strict diet control. Low salt. Regular walking. Review after reports.',
        consultationFee: 1000, createdAt: '2026-09-17T15:15:00.000Z'
      }
    ];
    state.prescriptions = prescriptions;

    resolve(true);
  });
}
