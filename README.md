Hasura Django Migration
==============
This is an example of migrating django API (possibly REST or graphene) to hasura, with authentication part in the express JWT auth-server, and the rest handled by [hasura graphql engine](https://github.com/hasura/graphql-engine).

File Structure and Migration Guide
--------------
### Postgresql Stuff

Here are the configurations used in this example.

1. Roles: `create role hasura with password hasura superuser;`

    | Role name | Attributes |
    |-----------|------------|
    | hasura    | Superuser  |

1. Databases: `create database hasura; grant all on database hasura to hasura;`

    | Name   | Encoding | Collate     | Ctype       |
    |--------|----------|-------------|-------------|
    | hasura | UTF8     | en_US.UTF-8 | en_US.UTF-8 |


### Django Stuff

```
.
├── manage.py
└── hasura
    ├── settings.py
    ├── urls.py
    └── wsgi.py
```

This is the simplest project created by `django-admin startproject hasura`.

We will use the default generated `auth_user` table for authentication, `auth_groups` and `auth_user_groups` for user role decision.

Use `./manage.py migrate` to generate the tables.

### Auth-server Stuff

```
.
├── package.json
├── server
│   ├── config
│   │   └── jwt.js
│   ├── controllers
│   │   └── user.js
│   ├── db
│   │   ├── auth.js
│   │   ├── encode.js
│   │   └── schema.js
│   └── index.js
└── yarn.lock
```

The express server handling jwt authentication. The server requires private and public keys, which can be generated with `yarn keygen`.

Use `npm run dev` or `yarn dev` to start the server.

The server implements two POST endpoints:

1. Login endpoint: `/webhook/login`
    - test: `curl http://localhost:3000/webhook/login -H 'Content-Type: application/json' -d '{"username": "root", "password": "toor"}'`
1. Signup endpoint: `/webhook/signup`
    - test: `curl http://localhost:3000/webhook/signup -H 'Content-Type: application/json' -d '{"username": "test", "password": "testpass"}'`

There are also two GET endpoints used by hasura, which should not be exposed:

1. Get user information from `Authorization: Bearer` token: `/webhook/webhook`
1. Get general jwk information: `/webhook/jwks`

The auth-server implements 4 roles:

- admin: if `User.is_admin == True`
- staff: if `User.is_staff == True`
- user: if the viewer is logged in (has a valid authorization header)
- anonymous: viewers not logged in

All the logged in users will have default role `user`, and `admin` and `staff` will be present in `X-Hasura-Allowed-Roles` if available.

### Hasura Stuff

```
.
├── config
│   └── metadata.json
├── config.yaml
├── docker-run.sh
└── migrations
```

The metadata stores the default permissions for `user` and `anonymous`. You can import it in hasura console -&lt; settings -&lt; Import Metadata.

Requisitories
-----------
- Postgresql

    ```bash
    # Debian-based systems
    apt-get install postgresql
    ```

- Python 3.5 + and depending packages

    ```bash
    pip install -r ./requirements.txt
    ```

- nodejs manager (latest `npm` or `yarn`).

    ```bash
    # Use npm
    npm install
    # Use yarn
    yarn
    ```

- Docker CE
- hasura/graphql-engine. It will be automatically installed at your first run of `docker-run`.

Environment Variables
--------

| env              | description                       | default                                        |
|------------------|-----------------------------------|------------------------------------------------|
| DBURL            | Postgres database URL             | postgres://hasura:hasura@localhost:5432/hasura |
| AUTH_PRIVATE_KEY | Private key for authorization     | Content of `private.pem`                       |
| AUTH_PUBLIC_KEY  | Public key for authorization      | Content of `public.pem`                        |
| AUTH_KEY_ID      | Key identifier for the key        | Hash of \$AUTH_PUBLIC_KEY                      |
| NODE_ENV         | Node env (development/production) |                                                |
