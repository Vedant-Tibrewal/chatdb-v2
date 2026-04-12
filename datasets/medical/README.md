# Medical / Healthcare Dataset

Placeholder for the medical/healthcare base dataset.

This directory will contain CSV files with sample healthcare data that get cloned into session-scoped schemas at session creation time.

## Expected Tables
- `patients` — patient_id, name, age, gender, admission_date, discharge_date, type (OPD/IPD)
- `diagnoses` — diagnosis_id, patient_id, diagnosis, department, doctor_id
- `surgeries` — surgery_id, patient_id, surgery_type, surgery_date, doctor_id
- `doctors` — doctor_id, name, department, specialization
