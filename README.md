# Contrato PRO MADERNA — Deploy en Vercel + Supabase

## Stack
- **Frontend**: Next.js 14 (App Router)
- **Auth + DB**: Supabase
- **Deploy**: Vercel
- **Docs**: generación Word/PDF en servidor

---

## PASO 1 — Crear proyecto en Supabase

1. Ir a https://supabase.com → New project
2. Guardar: `Project URL` y `anon key`
3. En SQL Editor ejecutar:

```sql
-- Tabla de usuarios con roles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  nombre text,
  rol text check (rol in ('corredor','locador','locatario')) default 'corredor',
  plan text check (plan in ('basico','pro','premium')) default 'basico',
  contratos_disponibles int default 1,
  created_at timestamp default now()
);

-- Tabla de contratos generados
create table contratos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  datos jsonb not null,
  estado text default 'borrador',
  archivo_word text,
  archivo_pdf text,
  created_at timestamp default now()
);

-- RLS: cada usuario solo ve sus contratos
alter table profiles enable row level security;
alter table contratos enable row level security;

create policy "usuarios ven su perfil"
  on profiles for all using (auth.uid() = id);

create policy "usuarios ven sus contratos"
  on contratos for all using (auth.uid() = user_id);

-- Trigger: crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

4. En Authentication → Providers → activar **Google OAuth**
   - Agregar Client ID y Secret de Google Cloud Console

---

## PASO 2 — Variables de entorno

Crear archivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (solo server-side)
```

---

## PASO 3 — Deploy en Vercel

```bash
npm install
vercel --prod
```

En Vercel Dashboard → Settings → Environment Variables: agregar las 3 variables.

---

## PASO 4 — Activar Storage en Supabase

1. Storage → New bucket → nombre: `contratos` → privado
2. Policy: solo usuarios autenticados pueden leer sus propios archivos

```sql
create policy "usuarios descargan sus archivos"
  on storage.objects for select
  using (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Flujo completo

1. Usuario entra → ve pantalla de login
2. Se registra (email+pass o Google) → elige rol
3. Completa el formulario de 10 pasos
4. En paso 10 → botón "Descargar Word" / "Descargar PDF"
5. Sistema verifica sesión activa en Supabase
6. Si tiene contratos disponibles → genera y descarga
7. Si no tiene → redirige a planes y pagos
