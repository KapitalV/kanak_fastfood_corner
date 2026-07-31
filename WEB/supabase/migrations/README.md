# Supabase migrations

Apply these files in filename order with the Supabase CLI or SQL editor. Never edit a migration that has already been applied; add the next numbered migration instead. Each migration contains rollback notes, but rollback should be reviewed against live dependencies before execution.

`schema.sql` remains the bootstrap reference for a new local project. Existing installations should use the numbered migrations and should not be modified through production data access from this repository.
