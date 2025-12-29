-- Add billing_month column to upload_logs to store the invoice month selected by user
ALTER TABLE public.upload_logs 
ADD COLUMN billing_month date;