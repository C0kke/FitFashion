SELECT 'CREATE DATABASE fitfashion_cart_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fitfashion_cart_db')\gexec