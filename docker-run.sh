#! /bin/bash
docker run -d --net=host \
       -e HASURA_GRAPHQL_DATABASE_URL=postgres://hasura:hasura@localhost:5432/hasura \
       -e HASURA_GRAPHQL_ENABLE_CONSOLE=true \
       -e HASURA_GRAPHQL_JWT_SECRET='{
          "type": "RS256",
          "jwk_url": "http://localhost:3000/webhook/jwks",
          "claims_namespace": "https://localhost:3000/jwt/claims",
          "claims_format": "json"
       }' \
       -e HASURA_GRAPHQL_ADMIN_SECRET="HASURAADMIN" \
       -e HASURA_GRAPHQL_UNAUTHORIZED_ROLE=anonymous \
       hasura/graphql-engine:latest
