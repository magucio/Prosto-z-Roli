-- Prosto z Roli — migracja 9: cena stała musi mieć kwotę.
-- Poprzedni CHECK przepuszczał price = NULL przy price_type = 'fixed' (NULL w warunku CHECK nie jest błędem).
alter table public.listing_products drop constraint listing_products_price;
alter table public.listing_products add constraint listing_products_price check (
  (price_type = 'fixed' and price is not null and price > 0 and price < 1000000)
  or (price_type = 'negotiable' and price is null));
