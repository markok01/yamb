-- Email kao username — produži kolonu
USE yamb;

ALTER TABLE users MODIFY COLUMN username VARCHAR(255) NOT NULL;
