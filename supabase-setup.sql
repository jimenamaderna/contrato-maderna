-- =============================================
-- CONTRATO PRO MADERNA — Supabase SQL Setup
-- Ejecutar en SQL Editor de Supabase
-- =============================================

-- 1. TABLA DE PERFILES (extiende auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  nombre text,
  rol text check (rol in ('corredor','locador','locatario')) default 'corredor',
  plan text check (plan in ('basico','pro','premium')) default 'basico',
  contratos_disponibles int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. TABLA DE CONTRATOS
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  datos jsonb not null,
  estado text check (estado in ('borrador','generado','firmado')) default 'borrador',
  archivo_word text,
  archivo_pdf text,
  created_at timestamp with time zone default now()
);

-- 3. TABLA DE PAGOS
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan text not null,
  monto numeric not null,
  moneda text default 'ARS',
  estado text check (estado in ('pendiente','aprobado','rechazado')) default 'pendiente',
  mp_payment_id text,
  contratos_otorgados int default 0,
  created_at timestamp with time zone default now()
);

-- 4. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.contratos enable row level security;
alter table public.pagos enable row level security;

-- Políticas de acceso
create policy "usuarios ven y editan su propio perfil"
  on public.profiles for all
  using (auth.uid() = id);

create policy "usuarios ven sus propios contratos"
  on public.contratos for all
  using (auth.uid() = user_id);

create policy "usuarios ven sus propios pagos"
  on public.pagos for all
  using (auth.uid() = user_id);

-- 5. TRIGGER: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'corredor')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. FUNCIÓN: agregar contratos al aprobar pago
create or replace function public.aprobar_pago(pago_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  p record;
  contratos_a_agregar int;
begin
  select * into p from public.pagos where id = pago_id;
  
  case p.plan
    when '1_contrato' then contratos_a_agregar := 1;
    when '2_contratos' then contratos_a_agregar := 2;
    when '5_contratos' then contratos_a_agregar := 5;
    else contratos_a_agregar := 0;
  end case;

  update public.pagos set estado = 'aprobado', contratos_otorgados = contratos_a_agregar where id = pago_id;
  update public.profiles set contratos_disponibles = contratos_disponibles + contratos_a_agregar where id = p.user_id;
end;
$$;

-- 7. STORAGE: bucket privado para contratos generados
-- (Ejecutar en Storage tab de Supabase, no en SQL)
-- insert into storage.buckets (id, name, public) values ('contratos', 'contratos', false);

-- Política de storage: usuarios ven solo sus archivos
create policy "usuarios descargan sus archivos"
  on storage.objects for select
  using (
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "usuarios suben sus archivos"
  on storage.objects for insert
  with check (
    auth.uid()::text = (storage.foldername(name))[1]
  );
