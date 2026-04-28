-- Ruoli applicativi per RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin_role') THEN
    CREATE ROLE admin_role NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supplier_role') THEN
    CREATE ROLE supplier_role NOINHERIT;
  END IF;
END $$;

-- Il ruolo applicativo (l'utente con cui NestJS si connette) deve poter
-- eseguire SET ROLE per impersonare admin_role/supplier_role.
GRANT admin_role TO soulmovie_app;
GRANT supplier_role TO soulmovie_app;
