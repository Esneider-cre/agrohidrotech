-- =====================================================================
-- AgroHidroTech · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================

-- ---------- 1. Perfiles de usuario y roles ----------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null check (char_length(nombre) between 2 and 80),
  rol        text not null default 'ganadero' check (rol in ('productor', 'ganadero')),
  creado_en  timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse (lee nombre y rol de los metadatos)
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'rol' = 'productor' then 'productor' else 'ganadero' end
  );
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- Devuelve true si el usuario autenticado es productor (se usa en las políticas RLS)
create or replace function public.es_productor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'productor'
  );
$$;

-- ---------- 2. Contenedores hidropónicos ----------
create table if not exists public.contenedores (
  id         bigint generated always as identity primary key,
  codigo     text not null unique,
  nombre     text not null,
  ubicacion  text not null default 'Valencia, Córdoba',
  creado_en  timestamptz not null default now()
);

-- ---------- 3. Cosechas (módulo CRUD) ----------
create table if not exists public.cosechas (
  id              bigint generated always as identity primary key,
  lote            text not null unique check (lote ~ '^L-[0-9]{3,6}$'),
  contenedor_id   bigint not null references public.contenedores (id) on delete restrict,
  cultivo         text not null check (cultivo in ('maiz', 'sorgo')),
  estado          text not null default 'crecimiento'
                    check (estado in ('crecimiento', 'cosechado', 'perdido')),
  fecha_siembra   date not null,
  fecha_cosecha   date,
  bandejas        int  not null check (bandejas between 1 and 200),
  produccion_kg   numeric(8, 2) check (produccion_kg >= 0),
  observaciones   text check (char_length(observaciones) <= 500),
  creado_por      uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint cosecha_fechas_validas check (fecha_cosecha is null or fecha_cosecha >= fecha_siembra),
  constraint cosechado_requiere_datos check (
    estado <> 'cosechado' or (fecha_cosecha is not null and produccion_kg is not null)
  )
);
create index if not exists cosechas_contenedor_idx on public.cosechas (contenedor_id);
create index if not exists cosechas_creado_por_idx on public.cosechas (creado_por);

create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;
drop trigger if exists cosechas_actualizado on public.cosechas;
create trigger cosechas_actualizado before update on public.cosechas
  for each row execute function public.tocar_actualizado_en();

-- ---------- 4. Telemetría IoT (módulo dinámico) ----------
create table if not exists public.lecturas (
  id             bigint generated always as identity primary key,
  contenedor_id  bigint not null references public.contenedores (id) on delete cascade,
  temperatura    numeric(5, 2) not null,   -- °C
  humedad        numeric(5, 2) not null,   -- %
  ph             numeric(4, 2) not null,
  conductividad  numeric(5, 2) not null,   -- mS/cm
  registrado_en  timestamptz not null default now()
);
create index if not exists lecturas_contenedor_fecha_idx
  on public.lecturas (contenedor_id, registrado_en desc);

-- Rangos óptimos por contenedor
create table if not exists public.umbrales (
  contenedor_id  bigint primary key references public.contenedores (id) on delete cascade,
  temp_min  numeric(5, 2) not null default 18,  temp_max  numeric(5, 2) not null default 28,
  hum_min   numeric(5, 2) not null default 70,  hum_max   numeric(5, 2) not null default 90,
  ph_min    numeric(4, 2) not null default 5.5, ph_max    numeric(4, 2) not null default 6.5,
  ce_min    numeric(5, 2) not null default 1.2, ce_max    numeric(5, 2) not null default 2.2,
  constraint umbrales_ordenados check (
    temp_min < temp_max and hum_min < hum_max and ph_min < ph_max and ce_min < ce_max
  )
);

create table if not exists public.alertas (
  id             bigint generated always as identity primary key,
  contenedor_id  bigint not null references public.contenedores (id) on delete cascade,
  lectura_id     bigint references public.lecturas (id) on delete cascade,
  sensor         text not null check (sensor in ('temperatura', 'humedad', 'ph', 'conductividad')),
  valor          numeric(6, 2) not null,
  nivel          text not null check (nivel in ('advertencia', 'critica')),
  mensaje        text not null,
  creado_en      timestamptz not null default now()
);
create index if not exists alertas_contenedor_fecha_idx on public.alertas (contenedor_id, creado_en desc);
create index if not exists alertas_lectura_idx on public.alertas (lectura_id);

-- Cada lectura nueva se compara con los umbrales y genera alertas.
-- Crítica = se sale del rango por más del 10 % del ancho del rango; si no, advertencia.
create or replace function public.evaluar_lectura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.umbrales%rowtype;
  s record;
begin
  select * into u from public.umbrales where contenedor_id = new.contenedor_id;
  if not found then
    return new;
  end if;

  for s in
    select * from (values
      ('temperatura',   new.temperatura,   u.temp_min, u.temp_max, '°C'),
      ('humedad',       new.humedad,       u.hum_min,  u.hum_max,  '%'),
      ('ph',            new.ph,            u.ph_min,   u.ph_max,   ''),
      ('conductividad', new.conductividad, u.ce_min,   u.ce_max,   'mS/cm')
    ) as t(sensor, valor, minimo, maximo, unidad)
  loop
    if s.valor < s.minimo or s.valor > s.maximo then
      insert into public.alertas (contenedor_id, lectura_id, sensor, valor, nivel, mensaje)
      values (
        new.contenedor_id, new.id, s.sensor, s.valor,
        case when s.valor < s.minimo - (s.maximo - s.minimo) * 0.1
               or s.valor > s.maximo + (s.maximo - s.minimo) * 0.1
             then 'critica' else 'advertencia' end,
        initcap(s.sensor) || case when s.valor > s.maximo then ' alta: ' else ' baja: ' end
          || s.valor || ' ' || s.unidad || ' (rango ' || s.minimo || '–' || s.maximo || ')'
      );
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists lecturas_evaluar on public.lecturas;
create trigger lecturas_evaluar after insert on public.lecturas
  for each row execute function public.evaluar_lectura();

-- ---------- 5. Seguridad: Row Level Security ----------
-- Todos los usuarios autenticados pueden consultar; sólo el rol productor modifica.
alter table public.perfiles     enable row level security;
alter table public.contenedores enable row level security;
alter table public.cosechas     enable row level security;
alter table public.lecturas     enable row level security;
alter table public.umbrales     enable row level security;
alter table public.alertas      enable row level security;

drop policy if exists "perfil propio: leer" on public.perfiles;
create policy "perfil propio: leer" on public.perfiles
  for select to authenticated using (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['contenedores', 'cosechas', 'lecturas', 'umbrales', 'alertas'] loop
    execute format('drop policy if exists "autenticados: leer" on public.%I', t);
    execute format('create policy "autenticados: leer" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

drop policy if exists "productor: crear cosechas" on public.cosechas;
create policy "productor: crear cosechas" on public.cosechas
  for insert to authenticated with check ((select public.es_productor()));
drop policy if exists "productor: editar cosechas" on public.cosechas;
create policy "productor: editar cosechas" on public.cosechas
  for update to authenticated using ((select public.es_productor())) with check ((select public.es_productor()));
drop policy if exists "productor: borrar cosechas" on public.cosechas;
create policy "productor: borrar cosechas" on public.cosechas
  for delete to authenticated using ((select public.es_productor()));

drop policy if exists "productor: editar umbrales" on public.umbrales;
create policy "productor: editar umbrales" on public.umbrales
  for update to authenticated using ((select public.es_productor())) with check ((select public.es_productor()));

-- El simulador IoT corre en la sesión del productor (en producción lo haría el ESP32 con una llave de servicio)
drop policy if exists "productor: enviar lecturas" on public.lecturas;
create policy "productor: enviar lecturas" on public.lecturas
  for insert to authenticated with check ((select public.es_productor()));

-- Las funciones de trigger no deben poder llamarse por la API; es_productor sólo la usan usuarios autenticados (RLS)
revoke execute on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;
revoke execute on function public.evaluar_lectura() from public, anon, authenticated;
revoke execute on function public.es_productor() from public, anon;
grant execute on function public.es_productor() to authenticated;

-- ---------- 6. Tiempo real ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'lecturas') then
    alter publication supabase_realtime add table public.lecturas;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'alertas') then
    alter publication supabase_realtime add table public.alertas;
  end if;
end $$;

-- ---------- 7. Datos semilla ----------
insert into public.contenedores (codigo, nombre, ubicacion) values
  ('C-01', 'Valencia Piloto', 'Valencia, Córdoba'),
  ('C-02', 'Hub Comunitario', 'Valencia, Córdoba')
on conflict (codigo) do nothing;

insert into public.umbrales (contenedor_id)
select id from public.contenedores
on conflict (contenedor_id) do nothing;

insert into public.cosechas (lote, contenedor_id, cultivo, estado, fecha_siembra, fecha_cosecha, bandejas, produccion_kg, observaciones, creado_por)
select v.lote, c.id, v.cultivo, v.estado, v.siembra::date, v.cosecha::date, v.bandejas, v.kg, v.obs, null
from (values
  ('L-2601', 'C-01', 'maiz',  'cosechado',   '2026-09-22', '2026-10-01', 48, 372.0, 'Primer lote del piloto'),
  ('L-2602', 'C-02', 'maiz',  'cosechado',   '2026-09-29', '2026-10-08', 40, 338.5, null),
  ('L-2603', 'C-01', 'sorgo', 'cosechado',   '2026-10-06', '2026-10-15', 48, 398.0, null),
  ('L-2604', 'C-02', 'sorgo', 'cosechado',   '2026-10-10', '2026-10-19', 40, 301.0, null),
  ('L-2606', 'C-01', 'maiz',  'cosechado',   '2026-10-17', '2026-10-26', 48, 402.0, null),
  ('L-2607', 'C-01', 'sorgo', 'perdido',     '2026-10-24', '2026-11-01', 48, 112.0, 'Hongos por exceso de humedad'),
  ('L-2608', 'C-02', 'maiz',  'cosechado',   '2026-10-28', '2026-11-06', 40, 301.0, null),
  ('L-2609', 'C-01', 'maiz',  'cosechado',   '2026-11-03', '2026-11-12', 48, 386.0, null),
  ('L-2610', 'C-02', 'sorgo', 'crecimiento', '2026-11-10', null,         40, null,  null),
  ('L-2611', 'C-01', 'maiz',  'crecimiento', '2026-11-13', null,         48, null,  'Semilla certificada, remojo 24 h')
) as v(lote, contenedor, cultivo, estado, siembra, cosecha, bandejas, kg, obs)
join public.contenedores c on c.codigo = v.contenedor
on conflict (lote) do nothing;
