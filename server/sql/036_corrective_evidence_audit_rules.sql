-- Part 129: configurable corrective evidence access audit rules

create table if not exists corrective_evidence_audit_rules (
  id bigserial primary key,
  office_id text,
  permission_denied_enabled boolean not null default true,
  missing_reason_enabled boolean not null default true,
  bulk_download_enabled boolean not null default true,
  bulk_window_minutes integer not null default 10 check (bulk_window_minutes between 1 and 120),
  bulk_medium_threshold integer not null default 5 check (bulk_medium_threshold between 2 and 100),
  bulk_high_threshold integer not null default 10 check (bulk_high_threshold between 3 and 200),
  lookback_hours integer not null default 24 check (lookback_hours between 1 and 720),
  updated_by text not null,
  updated_at timestamptz not null default now(),
  check (bulk_high_threshold > bulk_medium_threshold)
);

create unique index if not exists uq_corrective_evidence_audit_rules_scope
  on corrective_evidence_audit_rules (coalesce(office_id, '__global__'));

create table if not exists corrective_evidence_audit_rule_history (
  id bigserial primary key,
  office_id text,
  changed_by text not null,
  change_reason text not null,
  previous_rule jsonb not null,
  next_rule jsonb not null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_corrective_evidence_audit_rule_history_changed_at
  on corrective_evidence_audit_rule_history (changed_at desc);
