# Technician Visit Reports

## Outcome
Technicians assigned to a job can attach visit photos and a voice note, generate an editable written report with Lovable AI Gateway, and receive an editable next-visit recommendation. Customers can read saved reports for their jobs.

## Work
1. Add a private media bucket and a `job_reports` table for each visit, with explicit grants and row-level policies limited to the assigned technician and job owner.
2. Add an authenticated server function that verifies job assignment and media ownership, transcribes voice notes, and drafts a report and next-visit recommendation through AI Gateway.
3. Add a technician report editor to the assigned job screen: photo/audio capture and selection, upload and generation states, editable report and visit suggestion, save, and prior visit history.
4. Show saved reports and their media to the customer on the matching job page, using protected short-lived links.
5. Verify authorization, upload, AI generation, report persistence/readback, responsive screens, and the project build.

## Technical details
- Keep provider calls and credentials in the server function; use the workspace default models for transcription and text generation.
- Keep media private and validate MIME type, size, and path ownership before processing.
- Persist one report per technician visit and allow the technician and customer on that job to read it; only its assigned technician may create or edit reports.
- Treat the AI output as a draft. Let the technician review and edit it before saving; keep the next-visit recommendation optional and editable.