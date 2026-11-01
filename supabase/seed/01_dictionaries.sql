-- Prosto z Roli — słowniki startowe (idempotentne: można uruchamiać wielokrotnie)
-- Kategorie mięso / nabiał / jaja / miód: widoczne, ale publikacja zablokowana (analysis_pending).

insert into public.categories (slug, name, kind, color, icon, sort, restriction_level, restriction_message) values
  ('owoce',              'Owoce',               'product', '#D64545', 'apple',            10, 'none', null),
  ('warzywa',            'Warzywa',             'product', '#E8833A', 'carrot',           20, 'none', null),
  ('mieso',              'Mięso',               'product', '#8E2C3A', 'food-steak',       30, 'analysis_pending',
     'Trwa analiza przepisów dotyczących sprzedaży (SB / RHD / MLO / zakład). Dodawanie ogłoszeń w tej kategorii będzie możliwe wkrótce.'),
  ('nabial',             'Nabiał',              'product', '#3B82C4', 'cup',              40, 'analysis_pending',
     'Trwa analiza przepisów dotyczących sprzedaży (SB / RHD / MLO / zakład). Dodawanie ogłoszeń w tej kategorii będzie możliwe wkrótce.'),
  ('jaja',               'Jaja',                'product', '#B5835A', 'egg',              50, 'analysis_pending',
     'Trwa analiza przepisów dotyczących sprzedaży (SB / RHD / MLO / zakład). Dodawanie ogłoszeń w tej kategorii będzie możliwe wkrótce.'),
  ('miod',               'Miód',                'product', '#F0A202', 'beehive-outline',  60, 'analysis_pending',
     'Trwa analiza przepisów dotyczących sprzedaży (SB / RHD / MLO / zakład). Dodawanie ogłoszeń w tej kategorii będzie możliwe wkrótce.'),
  ('zboza',              'Zboża',               'product', '#B8941F', 'barley',           70, 'none', null),
  ('pasze',              'Pasze',               'product', '#8A7650', 'sack',             80, 'none', null),
  ('nasiona-rozsady',    'Nasiona i rozsady',   'product', '#4E9A51', 'sprout',           90, 'none', null),
  ('inne',               'Inne z gospodarstwa', 'product', '#6B7280', 'basket',          100, 'none', null),
  ('uslugi-polowe',      'Prace polowe',        'service', '#5B5BD6', 'tractor',         110, 'none', null),
  ('uslugi-zbiory',      'Zbiory',              'service', '#7E57C2', 'grain',           120, 'none', null),
  ('uslugi-transport',   'Transport rolniczy',  'service', '#2E8B9A', 'truck',           130, 'none', null),
  ('uslugi-inne',        'Inne usługi',         'service', '#64748B', 'tools',           140, 'none', null)
on conflict (slug) do update set name = excluded.name, kind = excluded.kind, color = excluded.color,
  icon = excluded.icon, sort = excluded.sort, restriction_level = excluded.restriction_level,
  restriction_message = excluded.restriction_message;

insert into public.product_units (code, name, short_name, kind, sort) values
  ('kg',        'kilogram',    'kg',     'product', 10),
  ('g',         'gram',        'g',      'product', 20),
  ('t',         'tona',        't',      'product', 30),
  ('szt',       'sztuka',      'szt.',   'product', 40),
  ('l',         'litr',        'l',      'product', 50),
  ('worek',     'worek',       'worek',  'product', 60),
  ('skrzynka',  'skrzynka',    'skrz.',  'product', 70),
  ('opakowanie','opakowanie',  'op.',    'product', 80),
  ('peczek',    'pęczek',      'pęczek', 'product', 90),
  ('bela',      'bela',        'bela',   'product', 100),
  ('godzina',   'godzina',     'h',      'service', 110),
  ('hektar',    'hektar',      'ha',     'service', 120),
  ('usluga',    'usługa',      'usł.',   'service', 130),
  ('km',        'kilometr',    'km',     'service', 140),
  ('tona_usl',  'tona',        't',      'service', 150)
on conflict (code) do update set name = excluded.name, short_name = excluded.short_name,
  kind = excluded.kind, sort = excluded.sort;

with src (cat, name, unit, synonyms) as (values
  ('owoce', 'Jabłka', 'kg', '{jablko}'), ('owoce', 'Gruszki', 'kg', '{}'), ('owoce', 'Śliwki', 'kg', '{}'),
  ('owoce', 'Wiśnie', 'kg', '{}'), ('owoce', 'Czereśnie', 'kg', '{}'), ('owoce', 'Truskawki', 'kg', '{}'),
  ('owoce', 'Maliny', 'kg', '{}'), ('owoce', 'Borówki amerykańskie', 'kg', '{jagody}'),
  ('owoce', 'Porzeczki czarne', 'kg', '{}'), ('owoce', 'Porzeczki czerwone', 'kg', '{}'),
  ('owoce', 'Agrest', 'kg', '{}'), ('owoce', 'Aronia', 'kg', '{}'),
  ('warzywa', 'Ziemniaki', 'kg', '{kartofle,pyry}'), ('warzywa', 'Marchew', 'kg', '{marchewka}'),
  ('warzywa', 'Buraki', 'kg', '{burak}'), ('warzywa', 'Cebula', 'kg', '{}'), ('warzywa', 'Czosnek', 'kg', '{}'),
  ('warzywa', 'Kapusta biała', 'szt', '{}'), ('warzywa', 'Kapusta czerwona', 'szt', '{}'),
  ('warzywa', 'Pomidory', 'kg', '{}'), ('warzywa', 'Ogórki', 'kg', '{}'), ('warzywa', 'Papryka', 'kg', '{}'),
  ('warzywa', 'Kalafior', 'szt', '{}'), ('warzywa', 'Brokuł', 'szt', '{brokuly}'),
  ('warzywa', 'Pietruszka', 'kg', '{}'), ('warzywa', 'Seler', 'kg', '{}'), ('warzywa', 'Por', 'szt', '{}'),
  ('warzywa', 'Sałata', 'szt', '{}'), ('warzywa', 'Dynia', 'kg', '{}'), ('warzywa', 'Cukinia', 'kg', '{}'),
  ('warzywa', 'Fasolka szparagowa', 'kg', '{}'),
  ('mieso', 'Wieprzowina', 'kg', '{}'), ('mieso', 'Wołowina', 'kg', '{}'), ('mieso', 'Drób', 'kg', '{kurczak}'),
  ('mieso', 'Jagnięcina', 'kg', '{}'), ('mieso', 'Wędliny', 'kg', '{kielbasa}'),
  ('nabial', 'Mleko', 'l', '{}'), ('nabial', 'Śmietana', 'l', '{}'), ('nabial', 'Masło', 'kg', '{}'),
  ('nabial', 'Ser twarogowy', 'kg', '{twarog}'), ('nabial', 'Ser żółty', 'kg', '{}'), ('nabial', 'Jogurt', 'l', '{}'),
  ('jaja', 'Jaja kurze', 'szt', '{jajka}'), ('jaja', 'Jaja przepiórcze', 'szt', '{}'), ('jaja', 'Jaja kacze', 'szt', '{}'),
  ('miod', 'Miód wielokwiatowy', 'kg', '{}'), ('miod', 'Miód lipowy', 'kg', '{}'), ('miod', 'Miód rzepakowy', 'kg', '{}'),
  ('miod', 'Miód gryczany', 'kg', '{}'), ('miod', 'Miód akacjowy', 'kg', '{}'),
  ('zboza', 'Pszenica', 't', '{}'), ('zboza', 'Żyto', 't', '{}'), ('zboza', 'Owies', 't', '{}'),
  ('zboza', 'Jęczmień', 't', '{}'), ('zboza', 'Pszenżyto', 't', '{}'), ('zboza', 'Kukurydza ziarno', 't', '{}'),
  ('zboza', 'Rzepak', 't', '{}'),
  ('pasze', 'Siano', 'bela', '{}'), ('pasze', 'Słoma', 'bela', '{}'), ('pasze', 'Sianokiszonka', 'bela', '{}'),
  ('pasze', 'Kiszonka z kukurydzy', 't', '{}'), ('pasze', 'Śruta zbożowa', 'kg', '{}'), ('pasze', 'Otręby', 'kg', '{}'),
  ('nasiona-rozsady', 'Rozsada pomidorów', 'szt', '{}'), ('nasiona-rozsady', 'Rozsada papryki', 'szt', '{}'),
  ('nasiona-rozsady', 'Rozsada kapusty', 'szt', '{}'), ('nasiona-rozsady', 'Sadzonki truskawek', 'szt', '{}'),
  ('nasiona-rozsady', 'Ziemniaki sadzeniaki', 'kg', '{}'),
  ('inne', 'Kwiaty cięte', 'peczek', '{}'), ('inne', 'Zioła świeże', 'peczek', '{}'),
  ('inne', 'Orzechy włoskie', 'kg', '{}'), ('inne', 'Orzechy laskowe', 'kg', '{}'), ('inne', 'Choinki', 'szt', '{}'),
  ('uslugi-polowe', 'Orka', 'hektar', '{}'), ('uslugi-polowe', 'Uprawa gleby', 'hektar', '{kultywacja,talerzowanie}'),
  ('uslugi-polowe', 'Siew', 'hektar', '{}'), ('uslugi-polowe', 'Sadzenie ziemniaków', 'hektar', '{}'),
  ('uslugi-polowe', 'Nawożenie', 'hektar', '{rozsiewanie}'), ('uslugi-polowe', 'Opryski', 'hektar', '{}'),
  ('uslugi-zbiory', 'Koszenie traw', 'hektar', '{}'), ('uslugi-zbiory', 'Prasowanie bel', 'usluga', '{belowanie}'),
  ('uslugi-zbiory', 'Kombajnowanie zbóż', 'hektar', '{}'), ('uslugi-zbiory', 'Kopanie ziemniaków', 'hektar', '{}'),
  ('uslugi-zbiory', 'Zbiór kukurydzy na kiszonkę', 'hektar', '{sieczkarnia}'),
  ('uslugi-transport', 'Transport płodów rolnych', 'km', '{}'), ('uslugi-transport', 'Transport bel', 'km', '{}'),
  ('uslugi-inne', 'Przycinanie sadów', 'godzina', '{}'), ('uslugi-inne', 'Odśnieżanie', 'godzina', '{}'),
  ('uslugi-inne', 'Praca maszyną z operatorem', 'godzina', '{}')
)
insert into public.product_catalog (category_id, name, default_unit_id, synonyms, sort)
select c.id, s.name, u.id, s.synonyms::text[], row_number() over (partition by s.cat order by s.name)::int * 10
from src s
join public.categories c on c.slug = s.cat
join public.product_units u on u.code = s.unit
on conflict (category_id, lower(name)) do nothing;
