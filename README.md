<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-tHUdx4mxIdEbUo9Lrd6Ztu29MV7MYIE

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key.
3. Configure the ERP connection in `.env.local`:
   ```env
   VITE_ERP_API_URL=https://erp.example.com
   VITE_API_URL=http://localhost:3001
   ```
   `VITE_ERP_API_URL` is required and must point to PRATOFIT-ADMIN. The public menu uses `GET /api/online-menu`; checkout reserves stock through `POST /api/online-orders/reservations` before opening WhatsApp. The cardápio does not confirm a reservation automatically: payment confirmation must be handled by the ERP through `POST /api/online-orders/:reservationId/confirm`. The ERP must allow this frontend origin through CORS.
4. Run the app:
   `npm run dev`
