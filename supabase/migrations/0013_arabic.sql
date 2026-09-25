-- 0013: English and Arabic.
--
-- profiles.locale: the language someone picked (null = follow the browser).
-- Emails to them go out in it.
--
-- notifications.template / params: the message as a key plus values, so each
-- person reads it in their own language. `text` stays as the English
-- rendering for anything that doesn't know the key.
--
-- i18n on curriculum content: translations of the fields people read, as
-- { "ar": { "title": "...", ... } }. The main columns stay the English
-- original; the app falls back to them for any missing translation.

alter table profiles add column locale text check (locale in ('en', 'ar'));

alter table notifications add column template text;
alter table notifications add column params jsonb not null default '{}'::jsonb
  check (jsonb_typeof(params) = 'object');

alter table programmes        add column i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(i18n) = 'object');
alter table programme_modules add column i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(i18n) = 'object');
alter table lessons           add column i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(i18n) = 'object');
alter table spaces            add column i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(i18n) = 'object');

-- The existing "profiles update" policy lets people change their own row but
-- not their role, so they can set their own language. app_snapshot() returns
-- whole rows, so the new columns come through without changes.
